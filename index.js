'use strict';
const { buildEngine } = require('ember-engines/lib/engine-addon');
const { name } = require('./package');
const Funnel = require('broccoli-funnel');

module.exports = buildEngine({
    name,

    init() {
        if (this._super.init) this._super.init.apply(this, arguments);

        for (let addon of this.addons || []) {
            if (['@fleetbase/ember-core', '@fleetbase/ember-ui'].includes(addon.name)) {
                let origTreeFor = addon.treeFor?.bind(addon);
                addon.treeFor = function (type) {
                    if (type === 'styles') {
                        return undefined;
                    }
                    return origTreeFor ? origTreeFor(type) : undefined;
                };
            }
        }

        const origNonDup = this.nonDuplicatedAddonInvoke?.bind(this);
        this.nonDuplicatedAddonInvoke = (hook, args = []) => {
            if (hook === 'treeFor' && args[0] === 'styles') {
                return []; // prevents dependency style relocation funnel
            }
            return origNonDup ? origNonDup(hook, args) : [];
        };
    },

    postprocessTree(type, tree) {
        if (type === 'css') {
            tree = new Funnel(tree, {
                exclude: ['**/@fleetbase/ember-ui/**/*.css'],
                allowEmpty: true,
            });
        }

        return tree;
    },

    lazyLoading: {
        enabled: true,
    },

    isDevelopingAddon() {
        return true;
    },
});
