import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';

export default class GroupsIndexRoute extends Route {
    @service store;

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        view_group: { refreshModel: false },
        status: { refreshModel: true },
    };

    model(params) {
        const queryParams = { ...params };
        delete queryParams.view_group;

        return this.store.query('group', queryParams);
    }

    setupController(controller) {
        super.setupController(...arguments);
        later(controller, controller.openDeepLinkedResource);
    }
}
