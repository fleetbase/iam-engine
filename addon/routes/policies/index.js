import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';

export default class PoliciesIndexRoute extends Route {
    @service store;

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        view_policy: { refreshModel: false },
        status: { refreshModel: true },
        service: { refreshModel: true },
        type: { refreshModel: true },
    };

    model(params) {
        const queryParams = { ...params };
        delete queryParams.view_policy;

        return this.store.query('policy', queryParams);
    }

    setupController(controller) {
        super.setupController(...arguments);
        later(controller, controller.openDeepLinkedResource);
    }
}
