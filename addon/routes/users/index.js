import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';

export default class UsersIndexRoute extends Route {
    @service store;

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        view_user: { refreshModel: false },
        status: { refreshModel: true },
        role: { refreshModel: true },
        name: { refreshModel: true },
        phone: { refreshModel: true },
        email: { refreshModel: true },
    };

    model(params) {
        const queryParams = { ...params };
        delete queryParams.view_user;

        return this.store.query('user', { ...queryParams, is_user: 1 });
    }

    setupController(controller) {
        super.setupController(...arguments);
        later(controller, controller.openDeepLinkedResource);
    }
}
