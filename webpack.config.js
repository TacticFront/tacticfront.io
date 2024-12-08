import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => {
	const isProduction = argv.mode === 'production';

	return {
		entry: './src/client/Main.ts',
		output: {
			filename: 'bundle.js',
			path: path.resolve(__dirname, 'out'),
		},
		module: {
			rules: [
				{
					test: /\.bin$/,
					use: 'raw-loader'
				},
				{
					test: /\.txt$/,
					use: 'raw-loader'
				},
				{
					test: /\.ts$/,
					use: 'ts-loader',
					exclude: /node_modules/,
				},
				{
					test: /\.css$/,
					use: ['style-loader', 'css-loader']
				},
				{
					test: /\.(png|jpe?g|gif)$/i,
					type: 'asset/resource',
					generator: {
						filename: 'images/[hash][ext][query]'
					}
				},
				{
					test: /\.html$/,
					use: ['html-loader']
				},
				{
					test: /\.svg$/,
					type: 'asset/inline',
				},
				{
					test: /\.(woff|woff2|eot|ttf|otf)$/,
					use: [
						{
							loader: 'file-loader',
							options: {
								name: '[name].[ext]',
								outputPath: 'fonts/',
								publicPath: '../fonts/', // This is important
							}
						}
					]
				}
			],
		},
		resolve: {
			extensions: ['.tsx', '.ts', '.js'],
			alias: {
				'protobufjs/minimal': path.resolve(__dirname, 'node_modules/protobufjs/minimal.js')
			}
		},
		plugins: [
			new HtmlWebpackPlugin({
				template: './src/client/index.html',
				filename: 'index.html'
			}),
			new webpack.DefinePlugin({
				'process.env.WEBSOCKET_URL': JSON.stringify(isProduction ? '' : 'localhost:3000')
			}),
			new webpack.DefinePlugin({
				'process.env.GAME_ENV': JSON.stringify(isProduction ? 'prod' : 'dev')
			}),
		],
		devServer: isProduction ? {} : {
			static: {
				directory: path.join(__dirname, 'out'),
			},
			compress: true,
			port: 9000,
			proxy: [
				{
					context: ['/socket'],
					target: 'ws://localhost:3000',
					ws: true,
				},
				{
					context: ['/lobbies', '/join_game', '/join_lobby', '/private_lobby', '/start_private_lobby', '/lobby', '/archive_singleplayer_game'],
					target: 'http://localhost:3000',
					secure: false,
					changeOrigin: true,
				}
			],
		},
	};
};