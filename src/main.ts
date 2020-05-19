import Vue from 'vue'
import { VNode } from 'vue/types';
import swal from 'sweetalert'
import App from './App.vue'
import store from './store'

// import drizzleOptions from './blockchain'
// import drizzleVuePlugin from '@drizzle/vue-plugin'

// Vue.use(drizzleVuePlugin, {
//   store,
//   drizzleOptions
// })

import {
    library,
    icon
} from "@fortawesome/fontawesome-svg-core";
import {
    fas
} from "@fortawesome/free-solid-svg-icons";
import {
    fab
} from "@fortawesome/free-brands-svg-icons";
import {
    FontAwesomeIcon
    // FontAwesomeLayers,
    // FontAwesomeLayersText
} from "@fortawesome/vue-fontawesome";

library.add(fas);
library.add(fab);

Vue.component("font-awesome-icon", FontAwesomeIcon);
// Vue.component("font-awesome-layers", FontAwesomeLayers);
// Vue.component("font-awesome-layers-text", FontAwesomeLayersText);
Vue.config.productionTip = false
Vue.prototype.$icon = icon;
Vue.prototype.$swal = swal;
Vue.prototype.$strToHtml = (str: String) => {
    return {
        element: "div",
        attributes: {
            className: "swal-text-no-padding",
            innerHTML: str
        }
    };
    // let template = document.createElement('template');
    // template.innerHTML = '<div>' + str + '</div>';
    // return template.content.firstChild;
};

// Extract the function out, up here, so I'm not writing it twice
const update = (el,
    binding,
    vnode: VNode,
    oldVnode: VNode) => el.style.visibility = (binding.value) ? "hidden" : "";


Vue.directive("hide", {
    bind: update,
    // Run on subsequent updates to the value supplied to the directive
    update: update
})

new Vue({
    store,
    render: h => h(App)
}).$mount('#app')