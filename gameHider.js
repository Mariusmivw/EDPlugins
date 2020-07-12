const Plugin = require('../plugin');

module.exports = new Plugin({
	name: 'Game Hider',
	author: 'Mariusmivw#9806',
	description: 'Provides an option in the Game Activity menu to hide specific games when playing them',
	color: '#00000000',
	async load() {
		if (!this.settings.games) this.settings.games = {};

		const GameActivity = this.utils.getComponentFromFluxContainer(
			EDApi.findModule('getUserSettingsSections').getUserSettingsSections('')
			.find((section)=>section.section === 'Game Activity')
			.element
		);
		const unpatchings = (this.unpatchings = []);

		unpatchings.push(EDApi.monkeyPatch(
			GameActivity.prototype,
			'renderGameList',
			(data) => {
				// console.log('data', data)
				const originalReturn = data.callOriginalMethod();
				const games = originalReturn.props.children[1];
				if (games && games.length) {
					const displayName = games[0].type.prototype.renderOverlayToggle.displayName;
					if (!(displayName && displayName.startsWith('patched'))) {
						unpatchings.push(EDApi.monkeyPatch(
							games[0].type.prototype,
							'renderOverlayToggle',
							(d) => {
								// console.log('d', d)
								const returnVal = d.callOriginalMethod();
								const {createElement:e, Fragment} = EDApi.React;
								const { Switch } = ED.discordComponents;
								const props = d.thisObject.props;

								const valueFromProps = !props.isOverride || props.game.add !== false;
								let value = this.settings.games[props.game.exePath];
								if (typeof value !== 'boolean') value = valueFromProps;
								else if (value === valueFromProps) delete this.settings.games[props.game.exePath];

								class SwitchButton extends Switch {
									constructor(props) {
										super(props);
										this.props.onChange = this.props.onChange.bind(this);
									}
								}
								const onChange = this.handleToggle;
								const settings = this.settings;
								
								const switchButton = e(SwitchButton, {
									value, onChange: function(e){onChange.call(this, e, props, settings)}
								}, null);


								return e(Fragment, null, returnVal, switchButton);
							}
						));
					}
				}
				return originalReturn;
			}
		));
	},
	unload () {
		if (this.unpatchings && typeof this.unpatchings === "object") this.unpatchings.forEach(e=>e());
	},
	utils: {
		getComponentFromFluxContainer (component) {
			return (new component({})).render().type;
		}
	},
	handleToggle(event, props, settings) {
		const button = event.currentTarget;
		const RGS = JSON.parse(ED.localStorage.getItem('RunningGameStore'));
		const formattedName = `${props.game.exePath}:${props.game.name}`;
		if (props.isOverride) {
			const game = RGS.gameOverrides[formattedName];
			props.game.add = game.add = button.checked;
		} else {
			const index = RGS.gamesSeen.findIndex(g=>g.exePath===props.game.exePath&&g.name===props.game.name);
			const game = RGS.gamesSeen[index];
			props.game.add = game.add = button.checked;
			props.isOverride = true;
		}
		this.props.value = settings.games[props.game.exePath] = button.checked;
		ED.localStorage.setItem('RunningGameStore', JSON.stringify(RGS));

		EDApi.showToast.call({findModule:()=>EDApi.findAllModules('app')[1]}, 'Reload Discord for changes to take effect');

		// FIXME: update component when clicking button
		this.forceUpdate();
	}
});