/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */

export class JuinkItemSheet extends ItemSheet {

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["juink", "sheet", "item"],
            width: 350,
            height: 400,
            resizable: true
        });
    }

    /* -------------------------------------------- */

    /** @override */
    get template() {
        const path = "systems/juink/templates/sheets/item";
        return `${path}/${this.item.type}-sheet.html`;
    }

    /* -------------------------------------------- */

    /** @override */
    setPosition(options={}) {
        const position = super.setPosition(options);
        const sheetBody = this.element.find(".sheet-body");
        const bodyHeight = position.height - 192;
        sheetBody.css("height", bodyHeight);
        return position;
    }

    /* -------------------------------------------- */

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        html.find(".delete-item").click(async () => await this.document.delete());
    }

    /** @override */
    async getData(options) {
        let isOwner = false;
        let isEditable = this.isEditable;
    
        const data = super.getData(options);
    
        this.options.title = this.document.name;
        isOwner = this.document.isOwner;
        isEditable = this.isEditable;
        
        const itemData = this.item.toObject(false);
        data.system = this.item.system;
        
        data.dtypes = ["String", "Number", "Boolean"];
        data.isGM = game.user.isGM;
        
        data.enrichedBiography = await TextEditor.enrichHTML(this.object.system.description, {async: true});

        return data;
    }
}
