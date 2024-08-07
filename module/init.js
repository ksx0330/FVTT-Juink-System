/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import { JuinkActor } from "./documents/actor.js";
import { JuinkItem } from "./documents/item.js";
import { JuinkActorSheet } from "./sheets/actor-sheet.js";
import { JuinkScenarioSheet } from "./sheets/scenario-sheet.js";
import { JuinkItemSheet } from "./sheets/item-sheet.js";
import { JuinkJobSheet } from "./sheets/job-sheet.js";

import { JuinkSceneConfig } from "./sheets/scene-config.js";

import { JuinkEffectDialog } from "./dialogs/effect-dialog.js";
import { InfluenceDialog } from "./dialogs/influence-dialog.js"

import { JuinkRegisterHelpers } from "./handlebars.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
    console.log(`Initializing Juink System`);

    game.Juink = {
        relayMessage: relayMessage,
        addDice: addDice,
        changeDice: changeDice,
        reRollDice: reRollDice
    }

    CONFIG.Actor.documentClass = JuinkActor;
    CONFIG.Item.documentClass = JuinkItem;

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("juink", JuinkActorSheet, { makeDefault: true });
    Actors.registerSheet("juink", JuinkScenarioSheet, {
      types: ['scenario'],
      makeDefault: true
    });

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("juink", JuinkItemSheet, { makeDefault: true });
    Items.registerSheet("juink", JuinkJobSheet, {
      types: ['job'],
      makeDefault: true
    });

    Scenes.unregisterSheet("core", SceneConfig);
    Scenes.registerSheet("juink", JuinkSceneConfig, { makeDefault: true });
    
    JuinkRegisterHelpers.init();

    let itemPackName = 'juink.default-items-' + game.i18n.lang;

    game.settings.register("juink", "item-packs-name", {
        name: "SETTINGS.SetItemPack",
        hint: "SETTINGS.SetItemPack",
        scope: "world",
        type: String,
        default: itemPackName,
        config: true
    });
});

Hooks.once("ready", async function() {
    let content = `<div class="always-box"></div>`;
    $("body").append(content);
    updateAlwaysBox();
});

Hooks.on("updateActor", async (document, options, userId) => {
    updateAlwaysBox();
});

Hooks.on("updateScene", async (document, options, userId) => {
    updateAlwaysBox();
});

function updateAlwaysBox() {

    let scenario = null;
    if (game.scenes.active != null) {
        let scenarioId = game.scenes.active.getFlag("juink", "scenario");
        scenario = game.actors.get(scenarioId);
    }

    if(scenario == null) {
        $(".always-box").empty();
        return;
    }

    let fateDice = [];
    for (let dice of Object.values(scenario.system.dice))
        fateDice.push(dice);

    $(".always-box").empty();
    let content = `
        <div class="scenario">${scenario.name}</div>
        <div class="fate-dices">
            <div class="title">${game.i18n.localize("Juink.FateDices")}</div>
            <div class="dice-box">`;

    $(fateDice).each(element => {
        content += `
                <img class="dice" src="systems/juink/assets/dices/${fateDice[element]}.PNG" data-pos="${element}">
        `;
    });
    
    content += `
            </div>
        </div>
    `;

    if (game.user.isGM)
        content += `
        <div class="phase-buttons">
            <button class="next-phase">${game.i18n.localize("Juink.EndPhase")}</button>
            <button class="next-scenario">${game.i18n.localize("Juink.EndScenario")}</button>
        </div>
    `;
    $(".always-box").append(content);

    $(".always-box .scenario").click(() => scenario.sheet.render(true));
    $(".always-box .fate-dices .title").on('mousedown', async event => {
        if (!game.user.isGM)
            return;

        if (event.button == 2 || event.which == 3)
            await scenario.purgeDice();
        else 
            await scenario.chargeDice();
    });
    $(".always-box .fate-dices .dice").on('mousedown', async event => {
        if (!game.user.isGM)
            return;
        
        let pos = $(event.currentTarget)[0].dataset.pos;
        if (event.button == 2 || event.which == 3)
            scenario.useDice(pos);
        else 
            scenario.changeDice(pos);
    });

    let nextPhase = async () => {
        let actors = game.actors.filter(e => e.type == "character");
        for (let actor of actors) {
            let updates = {
                "system.itemUsage": false,
                "system.attributes.dice.select": "-",
                "system.attributes.dice.pool": 0,
            };

            for (let effect of Object.keys(actor.system.event))
                updates[`system.event.-=${effect}`] = null;
            await actor.update(updates);

            for (let item of actor.items) {
                if (item.type != "ability")
                    continue;
                if (item.system.used.limit == "phase")
                    await item.update({"system.used.state": false});
            }
        }
    }

    $(".always-box .next-phase").click(async () => await nextPhase());
    $(".always-box .next-scenario").click(async () => {
        await nextPhase();
        let actors = game.actors.filter(e => e.type == "character");
        for (let actor of actors) {
            let updates = {
                "system.life.value": actor.system.life.max,
                "system.hope.value": actor.system.hope.init,
                "system.life.mad.0": false,
                "system.life.mad.1": false,
                "system.life.mad.2": false,
                "system.address.favorite.state": false
            };
            await actor.update(updates);

            for (let item of actor.items) {
                if (item.type == "item")
                    await item.update({"system.quantity.value": item.system.quantity.max});

                if (item.type == "ability") {
                    console.log(item);
                    let updates = {};
                    if (item.system.used.limit == "scenario")
                        updates["system.used.state"] = false;
                    await item.update(updates);
                }
            }
        }


    });
}


Hooks.on('createScene', async (document, options, userId) => {
    if (!game.user.isGM)
        return;

    let actorData = {
        name: document.name,
        type: "scenario",
        system: {},
        ownership: {
            default: 3
        }
    };
    let actor = await Actor.create(actorData);
    await document.setFlag("juink", "scenario", actor.id);
});

Hooks.on("getSceneControlButtons", function(controls) {
    controls[0].tools.push({
        name: game.i18n.localize("Juink.FateDices"),
        title: game.i18n.localize("Juink.FateDices"),
        icon: "fas fa-yin-yang",
        visible: true,
        onClick: () => {
            $(".always-box").slideToggle();
        },
        button: true
    });

});



Hooks.on("renderChatLog", (app, html, data) => chatListeners(html));
Hooks.on("renderChatPopout", (app, html, data) => chatListeners(html));

async function chatListeners(html) {

    html.on('click', '.toggle-btn', async event => {
        event.preventDefault();
        const toggler = $(event.currentTarget);
        const style = event.currentTarget.dataset.style;
        const item = toggler.parent();
        const description = item.find('.' + style);
    
        toggler.toggleClass('open');
        description.slideToggle();
    });

    html.on('click', '.influence', async event => {
        event.preventDefault();
        const messageDom = event.currentTarget.closest(".chat-message");
        new InfluenceDialog(messageDom.dataset.messageId).render(true);
    });

    html.on('click', '.use-effect-btn', async event => {
        event.preventDefault();
        const messageDom = event.currentTarget.closest(".chat-message");
        const chatMessage = game.messages.get(messageDom.dataset.messageId);
        const actor = (game.user.character != null) ? game.user.character : game.actors.get(ChatMessage.getSpeaker().actor);
        if (actor == null) {
            new Dialog({
                title: "!!!!!!!",
                content: game.i18n.localize("Juink.Error.NotSettedActor"),
                buttons: {}
            }).render(true);
            return;
        }

        new JuinkEffectDialog(actor, "use", 0, null, chatMessage).render(true);
    });

}

function getMessageByActor(actor) {
    return game.messages.filter(e => e.speaker.actor == actor.id).pop();
}

async function addDice(message, dice, add) {
    let mRoll = message.rolls[0];

    let formula = mRoll.formula;
    if (add != 0)
        formula += "+" + add;
    
    let roll = new Roll(formula);
    roll.terms[0].number = dice;

    for (let result of mRoll.terms[0].results)
        roll.terms[0].results.push(result);
    
    await roll.roll();
    return roll;
}

async function changeDice(message, before, after) {
    let mRoll = message.rolls[0];

    let roll = await mRoll.clone();
    roll.terms[0].number = 0;
    
    for (let result of mRoll.terms[0].results) {
        if (result.result == before)
            roll.terms[0].results.push({result: after, active: true});
        else
            roll.terms[0].results.push(result);
    }
    
    await roll.roll();
    return roll;
}

async function reRollDice(message, nums) {
    let mRoll = message.rolls[0];

    let roll = await mRoll.clone();
    roll.terms[0].number = 0;

    for (let result of mRoll.terms[0].results) {
        if (nums.includes(result.result))
            roll.terms[0].number += 1;
        else
            roll.terms[0].results.push(result);
    }
    
    await roll.roll();
    return roll;
}

async function relayMessage(roll, chatMessage) {
    let actor = game.actors.get(chatMessage.speaker.actor);
    await actor.toMessage({
        title: chatMessage.flags.juink.title,
        showList: true,
        eventList: chatMessage.flags.juink.activeEffect.event,
        itemList: chatMessage.flags.juink.activeEffect.item,
        abilityList: chatMessage.flags.juink.activeEffect.ability,
        canInfluence: chatMessage.flags.juink.canInfluence,
        roll: roll
    }, {
        flags: chatMessage.flags, 
        rolls: [roll],
    });
}