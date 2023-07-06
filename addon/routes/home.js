import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class HomeRoute extends Route {
    @service fetch;

    model() {
        return this.fetch.get('metrics/iam');
    }
}
