const Plugin = require('../plugin');
const path = window.require('path');
const fs = window.require('fs');
const rl = window.require('readline');
const readFile = require('util').promisify(fs.readFile);

module.exports = new Plugin({
	name: 'Themes V2',
	settingsSectionName: 'Themes',
	author: 'Mariusmivw#9806',
	description: 'Adds a themes button in the user settings menu',
	color: `#${Math.floor(Math.random() * 0xff).toString(16).padStart(2, 0)}${Math.floor(Math.random() * 0xff).toString(16).padStart(2, 0)}${Math.floor(Math.random() * 0xff).toString(16).padStart(2, 0)}`,

	config: {
		path: {
			default: './themes'
		}
	},

	uninject (theme) {
		this.css[theme.path].watcher.close();
		this.css[theme.path].css.remove();
		delete this.css[theme.path];
	},
	inject (theme) {
		if (!this.css[theme.path]) this.css[theme.path] = {};
		const css = this.css[theme.path].css = document.createElement('style');
		readFile(theme.path).then((data) => {
			css.innerHTML = data;

			if (this.css[theme.path].watcher) this.css[theme.path].close();
			this.css[theme.path].watcher = fs.watch(theme.path, { encoding: 'utf-8' }, (eventType, filename) => {
				switch (eventType) {
					case 'rename':
						this.css[filename] = this.css[theme.path];
						delete this.css[theme.path];
						theme.path = filename;
					case 'change':
						readFile(theme.path).then(newData => css.innerHTML = newData);
						break;
					default:
						this.uninject(theme);
						break;
				}
			});
		}).catch(()=>console.error('Error loading theme:', theme));
		
		document.head.appendChild(css);
	},

	async loadThemes(dir) {
		const themes = fs.readdirSync(dir);
		const themesSetings = [];
		let i = 0;
		for (const theme of themes) {
			if (!theme.endsWith('.css')) continue;
			let setting = {
				index: i++,
				path: path.join(dir, theme),
				filename: theme,
				name: theme.replace(/(\.theme)?\.css$/, ''),
				author: 'unknown',
				description: '',
				version: null
			};
			const t = (this.settings.themes || []).find((t)=>t.name===setting.name);
			setting.enabled = t && t.enabled || false;
			if (theme.endsWith('.theme.css')) {
				const file = fs.createReadStream(path.join(dir, theme));
				const r = rl.createInterface({
					input: file,
					crlfDelay: Infinity,
				});
				const json = await new Promise((resolve, reject) => {
					r.once('line', (line) => {
						r.close();
						resolve(JSON.parse(
							line.replace(/^.*?{/, '{').replace(/}.*?$/, '}')
						));
					});
					r.once('error', reject);
				});
				setting = { ...setting, ...json };
			}
			themesSetings.push(setting);
		}
		return this.settings.themes = themesSetings;
	},

	initComponents() {
		const { createElement: e, Component, Fragment } = EDApi.React;
		const { Divider, Flex, Title, Switch, Text } = ED.discordComponents;
		const { margins } = ED.classMaps;

		const _this = this;

		class ThemeListing extends Component {
			constructor(props) {
				super(props);
			}

			handleToggle() {
				const enabled = this.props.theme.enabled = !this.props.theme.enabled;
				if (enabled) _this.inject(this.props.theme);
				else _this.uninject(this.props.theme);
				this.forceUpdate();
			}

			render() {
				const { theme } = this.props;
				return e(Fragment, null,
					e(Flex, { direction: Flex.Direction.VERTICAL},
						e(Flex, {align: Flex.Align.CENTER},
							e(Title, {tag: "h3", className: ""}, theme.name),
							e(Switch, {value: this.props.theme.enabled, onChange: this.handleToggle.bind(this)})
						),
						e(Text, {type: Text.Types.DESCRIPTION},
							e('div', null, theme.description)
						)
					),
					e(Divider, {className: [margins.marginTop20, margins.marginBottom20].join(' ')})
				)
			}
		}

		this.components = {
			ThemeListing
		}
	},

	components: {},

	load () {
		this.css = {};
		const dir = path.join(
			process.env.injDir,
			this.settings.path || this.config.path.default
		);
		this.loadThemes(dir);
		this.initComponents();
		this.settings.themes.forEach((theme) => {
			if (theme.enabled) this.inject(theme);
		});
	},

	unload () {
		this.settings.themes.forEach((theme)=>{
			if (theme.enabled) this.uninject(theme);
		});
	},

	generateSettingsSection () {
		const { createElement: e, Fragment } = EDApi.React;
		const { ThemeListing } = this.components;
		const { Text } = ED.discordComponents;
		if (!this.settings.enabled) {
			return e(Text, {type: Text.Types.DESCRIPTION},
				e('div'), null, `Please enable the ${this.name} plugin`
			);
		}
		return e(Fragment, null,
			this.settings.themes.map(theme=>e(ThemeListing, { theme }))
		);
	},
});
