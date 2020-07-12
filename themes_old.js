const Plugin = require('../plugin');
const path = window.require('path');
const fs = window.require('fs');
const rl = window.require('readline');

function makeThemeToggle(theme, currentTheme) {
    const a = window.ED.classMaps.alignment;
	const sw = window.ED.classMaps.switchItem;
	const cb = window.ED.classMaps.checkbox;
	const b = window.ED.classMaps.buttons;
	const d = window.ED.classMaps.description;
	return `
	<div id="${theme.name}-wrap" class="${a.vertical} ${a.justifyStart} ${a.alignStretch} ${a.noWrap} ${sw.switchItem}" style="flex: 1 1 auto;">
		<div class="${a.horizontal} ${a.justifyStart} ${a.alignStart} ${a.noWrap}" style="flex: 1 1 auto;">
			<h3 class="${sw.titleDefault}" style="flex: 1 1 auto;">${theme.name}</h3>
			<div id="${theme.name}" class="${cb.switchEnabled} ${theme.path == currentTheme ? cb.valueChecked : cb.valueUnchecked} ${cb.sizeDefault} ${cb.themeDefault}">
				<input type="checkbox" class="${cb.checkboxEnabled}">
			</div>
		</div>
		<div class="${d.description} ${d.modeDefault}" style="flex: 1 1 auto;">
			${theme.description ? theme.description : '<i>No Description Provided</i<'}
		</div>
		<div class="${window.ED.classMaps.divider} ${sw.dividerDefault}"></div>
	</div>
	`
}

module.exports = new Plugin({
	name: 'Themes',
	author: 'Mariusmivw#9806',
	description: 'Adds a themes button in the user settings menu',
	color: '#00000000',

	config: {
		path: {
			default: './themes',
			parse: function(folder) {
				if (!folder) {
					return false;
				}
				if (path.isAbsolute(folder)) {
					if (!fs.existsSync(folder)) {
						return false;
					}
					return path.relative(process.env.injDir, folder);
				} else {
					const p = path.join(process.env.injDir, folder);
					if (!fs.existsSync(p)) {
						return false;
					}
					return path.relative(process.env.injDir, p);
				}
			}
		}
	},

	loadTheme: function(path) {
		if (window.EDApi.isPluginEnabled('css_loader')) {
			const css_loader = window.ED.plugins.css_loader;
			module.exports.settings.currentTheme = css_loader.settings.path = path;
			css_loader.unload();
			css_loader.load();
			module.exports.save();
		}

	},

	save: function() {
		const edc = window.ED.config;
		window.ED.config = edc;
	},

	load: async function() {
		const dir = path.join(
			process.env.injDir,
			this.settings.path || this.config.path.default
		);
		const themes = fs.readdirSync(dir);
		console.log(themes);
		const themesSetings = [];
		let i = 0;
		for (const theme of themes) {
			if (!theme.endsWith('.css')) continue;
			let setting = {
				index: i++,
				path: path.join(this.settings.path || this.config.path.default, theme),
				name: theme.replace(/(\.theme)?\.css$/, ''),
				author: 'unknown',
				description: '',
				version: null
			};
			console.log(
				path.join(this.settings.path || this.config.path.default, theme)
			);
			if (theme.endsWith('.theme.css')) {
				const file = fs.createReadStream(path.join(dir, theme));
				const r = rl.createInterface({
					input: file,
					crlfDelay: Infinity
				});
				const json = await new Promise((res, rej) => {
					r.once('line', (line) => {
						res(
							JSON.parse(
								line.replace(/^.*?{/, '{').replace(/}.*?$/, '}')
							)
						);
					});
					r.once('error', rej);
				});
				setting = { ...setting, ...json };
			}
			themesSetings.push(setting);
		}
		this.settings.themes = themesSetings;




		const tabsM = window.EDApi.findModule('topPill');
		const contentM = (window.ED.classMaps.headers = window.EDApi.findModule('defaultMarginh2'));
		const marginM = (window.ED.classMaps.margins = window.EDApi.findModule('marginBottom8'));
        const cbM = window.ED.classMaps.checkbox = window.EDApi.findModule('checkboxEnabled');
		const contentCol = window.EDApi.findModule('contentColumn');

		const gss = window.EDApi.findModule('getUserSettingsSections').default
			.prototype;
		window.EDApi.monkeyPatch(gss, 'render', function() {
			const ret = arguments[0].callOriginalMethod(
				arguments[0].methodArguments
			);

			if (window.EDApi.isPluginEnabled('ed_settings')) {
				const tab = document.querySelectorAll(
					`.${tabsM.header}.ed-settings`
				);
				if (tab && tab[0]) {
					const header = tab[0];
					const themesTab = document.createElement('div');
					const tabClass = `${tabsM.item} ${tabsM.themed} ed-settings themes-settings`;
					themesTab.className = tabClass;
					themesTab.innerHTML = 'Themes';
					header.parentNode.insertBefore(
						themesTab,
						header.nextSibling
					);

					themesTab.onclick = function(e) {
						const settingsPane = document.querySelector(
							`.${contentCol.standardSidebarView} .${contentCol.contentColumn} > div`
						);
						const otherTab = document.querySelector(
							'.' + tabsM.item + '.' + tabsM.selected
						);

						if (otherTab) {
							otherTab.className = otherTab.className.replace(
								' ' + tabsM.selected,
								''
							);
						}
						this.className += ` ${tabsM.selected}`;

						if (settingsPane) {
							settingsPane.innerHTML = `<h2 class="${contentM.h2} ${contentM.defaultColor} ${marginM.marginBottom8}">EnhancedDiscord Themes</h2>`;

							let radioGroup = `<div class="radioGroup-1GBvlr">`;
							for (const theme of module.exports.settings.themes) {
								radioGroup += makeThemeToggle(theme, module.exports.settings.currentTheme);
							}
							radioGroup += `</div>`;
							settingsPane.innerHTML += radioGroup;
						}
						e.stopPropagation();
					};

					document.querySelector(
						`.${contentCol.standardSidebarView} .${contentCol.contentColumn}`
					).onclick = function(e) {
						const parent = e.target.parentElement;

						if (e.target.tagName !== 'INPUT' || e.target.type !== 'checkbox' || !parent || !parent.className || !parent.id) return;
						if (parent.className.indexOf(cbM.valueChecked) > -1) {
							parent.className = parent.className.replace(
								cbM.valueChecked,
								cbM.valueUnchecked
							);
							module.exports.loadTheme(window.ED.plugins.css_loader.config.path.default);
						} else {
							const ch = parent.parentElement.parentElement.parentElement.getElementsByClassName(cbM.valueChecked)[0];
							if (ch) ch.className = ch.className.replace(cbM.valueChecked, cbM.valueUnchecked);
							parent.className = parent.className.replace(cbM.valueUnchecked, cbM.valueChecked);

							module.exports.loadTheme(module.exports.settings.themes.find(
								(v) => v.name == parent.id
							).path);
						}
					};
				}
			}
			return ret;
		});
	
	},

	unload: function() {
		window.EDApi.findModule(
			'getUserSettingsSections'
		).default.prototype.render.unpatch();
	},
	generateSettings: function() {
		const d = window.ED.classMaps.description;
		const b = window.ED.classMaps.buttons;
		const id = window.EDApi.findModule('inputDefault');
		const m = window.EDApi.findModule('marginTop8');

		const result = `<div class="${d.description} ${
			d.modeDefault
		}">Custom CSS Themes Path<br>This can be relative to the EnhancedDiscord directory (e.g. <code class="inline">./themes</code>) or absolute (e.g. <code class="inline">C:/themes/</code>).</div><input type="text" class="${
			id.inputDefault
		}" value="${this.settings.path ||
			this.config.path.default}" maxlength="2000" placeholder="${
			this.config.path.default
		}" id="custom-themes-path"><button type="button" id="save-themes-path" class="${
			b.button
		} ${b.lookFilled} ${b.colorBrand} ${m.marginTop8} ${
			m.marginBottom8
		}" style="height:24px;margin-right:10px;"><div class="${
			b.contents
		}">Save</div></button>`;
		return result;
	},
	settingsListeners: [
		{
			el: '#save-themes-path',
			type: 'click',
			eHandler: function() {
				const pathInput = document.getElementById('custom-thems-path');
				if (!pathInput) return;
				if (
					pathInput.value &&
					module.exports.config.path.parse(pathInput.value) == false
				) {
					const cont = this.firstElementChild;
					cont.innerHTML = 'Invalid folder.';
					setTimeout(() => {
						try {
							cont.innerHTML = 'Save';
						} catch (err) {
							/*do nothing*/
						}
					}, 3000);
					return;
				}
				const newPath =
					module.exports.config.path.parse(pathInput.value) ||
					module.exports.config.path.default;
				const s = module.exports.settings;
				if (s.path == newPath) {
					const cont = this.firstElementChild;
					cont.innerHTML = 'Path was already saved.';
					setTimeout(() => {
						try {
							cont.innerHTML = 'Save';
						} catch (err) {
							/*do nothing*/
						}
					}, 3000);
					return;
				}
				s.path = newPath;
				module.exports.settings = s;
				module.exports.unload();
				module.exports.load();
				const cont = this.firstElementChild;
				cont.innerHTML = 'Saved!';
				setTimeout(() => {
					try {
						cont.innerHTML = 'Save';
					} catch (err) {
						/*do nothing*/
					}
				}, 3000);
			}
		}
	]
});
