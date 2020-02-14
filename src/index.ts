import {
  JupyterFrontEnd, JupyterFrontEndPlugin
} from '@jupyterlab/application';


/**
 * Initialization data for the jupyterlab-execute-command extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-execute-command',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab-execute-command is activated!');
  }
};

export default extension;
