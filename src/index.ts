import { JupyterFrontEnd, JupyterFrontEndPlugin, ILabShell } from "@jupyterlab/application";
import { ISettingRegistry } from "@jupyterlab/coreutils";
import { ICommandPalette } from "@jupyterlab/apputils";
import { IDocumentManager } from "@jupyterlab/docmanager";
import { CommandRegistry } from "@phosphor/commands";
import { TerminalManager } from "@jupyterlab/services";
import { IDisposable } from "@phosphor/disposable";

import * as nunjucks from "nunjucks";
import * as path from "./simple-path";

export interface Entry {
    name: string;
    command?: string;
    category?: string;
    label?: string;
    raw?: boolean;
}

// JUPYTER_SERVER_ROOT
// https://github.com/jupyter/notebook/blob/d145301b5583366fc0c5e938ded80f07a0bc1bbf/notebook/terminal/__init__.py#L29-L30

class ExecuteCmmandPlugin {
    private disposers: IDisposable[] = [];
    private currentPath: string | null = null;

    constructor(
        private commands: CommandRegistry,
        private terminals: TerminalManager,
        private labShell: ILabShell,
        private docManager: IDocumentManager,
        private palette: ICommandPalette,
        private settings: ISettingRegistry.ISettings,
    ) {
        labShell.activeChanged.connect(this._onActiveChanged, this);
        settings.changed.connect(this._onSettingChanged, this);
        this.registerCommands(this.getConfig());
    }

    registerCommands(entries: Entry[]) {
        for (const entry of entries) {
            if (entry.command === undefined) {
                continue;
            }

            const commandDisposer = this.commands.addCommand(entry.name, {
                label: entry.label,
                execute: async () => {
                    const session = await this.terminals.startNew();

                    const template = entry.raw ? entry.command : `exec ${entry.command}\n`;
                    const p = this.currentPath;
                    const context = {
                        path: p,
                        dir: p ? path.dirname(p) : null,
                        base: p ? path.basename(p) : null,
                        ext: p ? path.extname(p) : null,
                    };

                    const content = nunjucks.renderString(template, context);

                    session.send({
                        type: "stdin",
                        content: [content],
                    });
                },
            });

            if (entry.category !== undefined && entry.label !== undefined) {
                const paletteDisposer = this.palette.addItem({ category: entry.category, command: entry.name });
                this.disposers.push(paletteDisposer);
            }

            this.disposers.push(commandDisposer);
        }
    }

    getConfig(): Entry[] {
        const def: Entry[] = this.settings.default("commands") as any;
        const user: Entry[] = this.settings.user.commands as any;
        const merged: { [key: string]: Entry } = {};

        for (const entry of [].concat(def, user)) {
            merged[entry.name] = entry;
        }

        return Object.values(merged);
    }

    private _onActiveChanged(_: ILabShell, change: ILabShell.IChangedArgs) {
        if (!change.newValue) {
            return;
        }

        const context = this.docManager.contextForWidget(change.newValue);
        if (!context) {
            this.currentPath = null;
            return;
        }

        this.currentPath = context.path;
    }

    unregisterCommands() {
        for (const disposer of this.disposers) {
            disposer.dispose();
        }
    }

    private _onSettingChanged() {
        this.unregisterCommands();
        this.registerCommands(this.getConfig());
    }

    dispose() {
        this.unregisterCommands();
        this.labShell.activeChanged.disconnect(this._onActiveChanged, this);
        this.settings.changed.disconnect(this._onSettingChanged, this);
    }
}

const plugin: JupyterFrontEndPlugin<void> = {
    id: "jupyterlab-execute-command:plugin",
    autoStart: true,
    requires: [ICommandPalette, ISettingRegistry, ILabShell, IDocumentManager],

    activate: async (
        app: JupyterFrontEnd,
        palette: ICommandPalette,
        registory: ISettingRegistry,
        labShell: ILabShell,
        docManager: IDocumentManager,
    ) => {
        new ExecuteCmmandPlugin(
            app.commands,
            app.serviceManager.terminals,
            labShell,
            docManager,
            palette,
            await registory.load(plugin.id),
        );
    },
};

export default plugin;
