export class JuinkRegisterHelpers {
  static init() {
    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('times', function(n, block) {
      var accum = '';
      for(var i = 0; i < n; ++i)
        accum += block.fn(i);
      return accum;
    });

    Handlebars.registerHelper('life', function(now, max) {
      let percent = now / max * 100;


      if (percent > 0)
        return `background: linear-gradient(90deg, lightslategray ${percent}%, black ${percent + 10}%);`;
      else if (percent > -100)
        return `background: linear-gradient(90deg, black ${percent + 100}%, #7e0018 ${percent + 110}%);`;
      else
        return `background: linear-gradient(90deg, #7e0018 ${percent + 200}%, #4a0000 ${percent + 210}%);`;

    });

    Handlebars.registerHelper('haveActor', function(arg1, options) {
      if (arg1.actor == null)
        return options.inverse(this);
      else
        return options.fn(this);
    });

    Handlebars.registerHelper('abilityCost', function(item) {
      let setFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);

      let normalType = setFirstLetter(item.system.cost.normal.type);
      let linkedType = setFirstLetter(item.system.cost.linked.type);

      let normal = (normalType == "-") ? game.i18n.localize("Juink.None") :
        game.i18n.localize(`Juink.${normalType}`) + " " + item.system.cost.normal.value;
      let linked = (linkedType == "-") ? game.i18n.localize("Juink.None") :
        game.i18n.localize(`Juink.${linkedType}`) + " " + item.system.cost.linked.value;
      
      return `${normal} / ${linked}`
    });

    Handlebars.registerHelper('abilityLimit', function(limit) {
      let setFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);
      return (limit == "-") ? game.i18n.localize("Juink.None") : game.i18n.localize(`Juink.${setFirstLetter(limit)}`);
    });

    Handlebars.registerHelper('isSuccess', function(item, options) {
      return (item.system.life.value >= item.system.life.max) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('debug', function(arg1) {
      console.log(arg1)
    });

    Handlebars.registerHelper('visibility', function(item, options) {
      return (item.system.visibility || game.user.isGM) ? options.fn(this) : options.inverse(this);
    });

  }
}