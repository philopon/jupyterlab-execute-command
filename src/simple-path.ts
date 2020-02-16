export const dirname = (s: string): string => {
    return s
        .split("/")
        .slice(0, -1)
        .join("/");
};

export const basename = (s: string): string => {
    let ss = s.split("/");
    return ss[ss.length - 1];
};

export const extname = (s: string): string => {
    let ss = basename(s).split(".");
    return "." + ss[ss.length - 1];
};
