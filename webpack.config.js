const path = require("path");
const { VueLoaderPlugin } = require("vue-loader");

module.exports = {
  mode: "production",
  entry: {
    content: "./src/content.ts",
    options: "./src/options.ts",
    background: "./src/background.ts",
  },
  output: {
    path: path.resolve(__dirname, "package/js"),
    filename: "[name].js",
  },
  resolve: {
    extensions: [".ts", ".js", ".vue"],
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: "vue-loader",
      },
      {
        test: /\.ts$/,
        loader: "ts-loader",
        options: {
          appendTsSuffixTo: [/\.vue$/],
          compilerOptions: {
            noEmit: false,
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [new VueLoaderPlugin()],
};
