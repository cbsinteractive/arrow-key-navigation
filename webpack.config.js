const path = require('path');

module.exports = {
	entry: './src/index.ts',
	mode: 'production',
	performance: {
		maxAssetSize: 50000,
		maxEntrypointSize: 50000,
		hints: "warning"
	},
	watch: true,
	watchOptions: {
		aggregateTimeout: 200,
		poll: 1500,
		ignored: ['**/_original', '**/js', '**/node_modules', '**/dist', '**/test'],
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules|js/,
			},
		],
	},
	resolve: {
		extensions: ['.ts', '.js'],
	},
	output: {
		filename: 'akn.js',
		path: path.resolve(__dirname, './dist'),
	},
};