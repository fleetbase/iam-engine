import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ApplicationController extends Controller {
    @service intl;
    @service abilities;
    @service fetch;

    get navigationItems() {
        return [
            {
                label: this.intl.t('iam.common.dashboard'),
                description: 'Identity and access overview.',
                tooltip: true,
                icon: 'home',
                route: 'console.iam.home',
                keywords: ['home', 'overview', 'metrics'],
            },
            {
                label: this.intl.t('iam.common.user'),
                description: 'Manage team member accounts.',
                icon: 'id-card',
                route: 'console.iam.users',
                permission: 'iam list user',
                visible: this.can('iam see user'),
                keywords: ['identity', 'accounts', 'members', 'people', 'team'],
            },
            {
                label: this.intl.t('iam.common.group'),
                description: 'Organize users into access groups.',
                icon: 'building',
                route: 'console.iam.groups',
                permission: 'iam list group',
                visible: this.can('iam see group'),
                keywords: ['teams', 'memberships'],
            },
            {
                label: this.intl.t('iam.common.roles'),
                description: 'Define reusable permission bundles.',
                icon: 'tag',
                route: 'console.iam.roles',
                permission: 'iam list role',
                visible: this.can('iam see role'),
                keywords: ['access levels'],
            },
            {
                label: this.intl.t('iam.common.policies'),
                description: 'Manage fine-grained access policies.',
                icon: 'shield',
                route: 'console.iam.policies',
                permission: 'iam list policy',
                visible: this.can('iam see policy'),
                keywords: ['permissions', 'rules'],
            },
        ];
    }

    can(permission) {
        try {
            return this.abilities.can(permission);
        } catch (_) {
            return true;
        }
    }

    @action
    async searchNavigation({ query, limit = 12 }) {
        const trimmedQuery = query?.trim();

        if (!trimmedQuery) {
            return [];
        }

        try {
            const response = await this.fetch.get('iam/search', {
                query: trimmedQuery,
                limit,
            });

            return response.results ?? [];
        } catch (_) {
            return [];
        }
    }
}
