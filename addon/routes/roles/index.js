import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';

export default class RolesIndexRoute extends Route {
    @service store;

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        view_role: { refreshModel: false },
        service: { refreshModel: true },
        type: { refreshModel: true },
    };

    model(params) {
        const queryParams = { ...params };
        delete queryParams.view_role;

        return this.store.query('role', queryParams);
    }

    setupController(controller) {
        super.setupController(...arguments);
        later(controller, controller.openDeepLinkedResource);
    }
}
