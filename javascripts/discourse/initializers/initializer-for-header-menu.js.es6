import { withPluginApi } from "discourse/lib/plugin-api";
import { iconNode } from "discourse-common/lib/icon-library";
import { dasherize } from "@ember/string";
import { h } from "virtual-dom";

const getItems = (items, fields) =>
      items.split('|')
           .filter(Boolean)
           .map(x => x.trim())
           .map((item, i) => {
             let subitems = item.split(',');
             let obj = Object.assign(
               ...fields.map((k, i) => ({[k]: (subitems[i] || '').trim()})));
             if (obj.text === "divider")
               obj.divider = true;
             return obj;
           });

const groupBy = function(xs, fn) {
  return xs.reduce((rv, x) => {
    let key = fn(x);
    (rv[key] = rv[key] || []).push(x);
    return rv;
  }, {});
}

const html = (selector, item, children) => {
  const text = item.icon ? [iconNode(item.icon), item.text] : item.text;
  const attrs = {
    title:  item.title,
    href:   item.url
  };
  if (item.target && item.target !== "self") {
    attrs.target = `_${item.target.toLowerCase()}`;
  }
  return h(
    `${selector}${item.divider ? ".divider" : ""}`,
    [
      item.divider ? "" : h("a", attrs, text),
      children
        ? h(`ul.header-submenu.${dasherize(item.text)}-header-submenu`,
            children)
        : false
    ].filter(Boolean)
  );
};

const menu_fields = [
  "text",
  "icon",
  "title",
  "url",
  "device",
  "target",
  "keepOnScroll"
];
const submenu_fields = [
  "parent",
  "text",
  "icon",
  "title",
  "url",
  "target"
];

export default {
  name: "discourse-header-menu",

  initialize() {
    withPluginApi("0.8.41", api => {
      try {
        const menu = getItems(settings.menu_items, menu_fields);
        if (!menu.length) return;
        const submenu = getItems(settings.submenu_items, submenu_fields);

        const submenuLinkGroups = submenu ? groupBy(submenu, x => x.parent) : {};
        const menuLinks = menu
              .map(x => {
                const keepOnScrollClass = x.keepOnScroll === 'keep' ? '.keep' : '';
                const className = `.${dasherize(x.title)}-menu-link`;
                const deviceClass = x.device ? `.${x.device}` : '';
                const submenuClass = submenuLinkGroups[x.text] ? ".has-submenu" : "";
                return html(
                  `li.menu-item${submenuClass}${deviceClass}${keepOnScrollClass}${className}`,
                  x,
                  submenuClass
                    ? submenuLinkGroups[x.text].map(y => html(`li.submenu-item.${dasherize(y.title)}-submenu-link`, y))
                    : null
                );
              });

        api.decorateWidget(
          settings.links_position === "right"
            ? "header-buttons:before"
            : "home-logo:after",
          helper => helper.h(
            "div.header",
            helper.h("ul.header-menu", menuLinks)
          ));

        api.decorateWidget("home-logo:after", helper => {
          const dHeader = document.querySelector(".d-header");
          if (!dHeader) return;

          const isTitleVisible = helper.attrs.minimized;
          if (isTitleVisible) {
            dHeader.classList.add("hide-menus");
          } else {
            dHeader.classList.remove("hide-menus");
          }
        });
      } catch (error) {
        console.error(error);
        console.error("There was an error with header-menu");
      }
    });
  }
};
