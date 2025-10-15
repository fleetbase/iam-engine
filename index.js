'use strict';
const { buildEngine } = require('ember-engines/lib/engine-addon');
const { name } = require('./package');
const Funnel = require('broccoli-funnel');

function isDevServe() {
    // env checks
    const env = process.env.EMBER_ENV || process.env.NODE_ENV || 'development';
    const isProd = env === 'production' || process.env.CI === 'true';

    // command-line checks (serve/watch only)
    const argv = process.argv.join(' ');
    const isServeCmd = /\b(ember|node).* (serve|server)\b/.test(argv) || process.argv.includes('serve') || process.argv.includes('server');
    const isWatch = process.argv.includes('--watch') || process.env.BROCCOLI_WATCHER;

    return !isProd && (isServeCmd || isWatch);
}

module.exports = buildEngine({
    name,

    init() {
        if (this._super.init) this._super.init.apply(this, arguments);

        if (isDevServe()) {
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
                    return []; // prevents dependency style relocation funnel (dev-only)
                }
                return origNonDup ? origNonDup(hook, args) : [];
            };
        }
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
