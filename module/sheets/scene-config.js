
export class JuinkSceneConfig extends SceneConfig {

    /** @override */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "scene-config",
            classes: ["sheet", "scene-sheet"],
            template: "systems/juink/templates/sheets/scene/scene-config.html",
            width: 560,
            height: "auto",
            tabs: [{navSelector: ".tabs", contentSelector: "form", initial: "basic"}]
        });
    }

  /* -------------------------------------------- */

    /** @override */
    getData(options={}) {
        const context = super.getData(options);
        context.data.scenario = this.document.getFlag("juink", "scenario");
        context.scenarios = this._getDocuments(game.actors.filter(e => e.type == "scenario"));
        return context;
    }

  /* -------------------------------------------- */


    /** @override */
    async _updateObject(event, formData) {
        await this.document.setFlag("juink", "scenario", formData["scenario"]);
        return super._updateObject(event, formData);
    }

  /* -------------------------------------------- */
}