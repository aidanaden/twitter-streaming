import { defineConfig } from "unocss";

export default defineConfig({
  extendTheme: (theme) => {
    return {
      ...theme,
      colors: {
        ...theme.colors,
        gray: {
          ...theme.colors.zinc,
          850: "#1f1f23",
        },
        green: {
          ...theme.colors.emerald,
        },
        red: {
          ...theme.colors.rose,
        },
      },
      breakpoints: {
        ...theme.breakpoints,
        xs: "480px",
      },
    };
  },
});
