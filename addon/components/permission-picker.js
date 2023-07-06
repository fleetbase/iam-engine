import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';
import { task } from 'ember-concurrency-decorators';

export default class PermissionPickerComponent extends Component {
    /**
     * Inject the `store` service.
     *
     * @memberof PermissionPickerComponent
     */
    @service store;

    /**
     * Inject the `notifications` service.
     *
     * @memberof PermissionPickerComponent
     */
    @service notifications;

    /**
     * Loaded permissions.
     *
     * @var {Array}
     * @memberof PermissionPickerComponent
     */
    @tracked permissions = [];

    /**
     * Selected permissions.
     *
     * @var {Array}
     * @memberof PermissionPickerComponent
     */
    @tracked selected = [];

    /**
     * The keyword search query.
     *
     * @memberof PermissionPickerComponent
     */
    @tracked query;

    /**
     * The guard to filter on.
     *
     * @memberof PermissionPickerComponent
     */
    @tracked guard;

    /**
     * If user has toggled to select all permissions
     *
     * @memberof PermissionPickerComponent
     */
    @tracked allSelected = false;

    /**
     * The loading state of the picker.
     *
     * @memberof PermissionPickerComponent
     */
    @tracked isLoading = false;

    /**
     * State of the initial permissions load.
     *
     * @memberof PermissionPickerComponent
     */
    @tracked isPermissionsLoaded = false;

    /**
     * The ID of each permission loaded.
     *
     * @readonly
     * @memberof PermissionPickerComponent
     */
    @computed('selected.[]') get ids() {
        return this.selected.map((permission) => permission.id);
    }

    /**
     * Creates an instance of PermissionPickerComponent.
     * @memberof PermissionPickerComponent
     */
    constructor() {
        super(...arguments);

        this.selected = isArray(this.args.selected) ? this.args.selected : [];
        this.guard = this.args.guard ?? 'web';
        this.queryPermissions();
    }

    /**
     * Selects all permissions.
     *
     * @memberof PermissionPickerComponent
     */
    @action selectAll(selected) {
        if (selected) {
            this.permissions.forEach((permission) => this.selectPermission(permission));
        } else {
            this.permissions.forEach((permission) => this.unselectPermission(permission));
        }
    }

    /**
     * Alias and shortcut to unselect permission.
     *
     * @param {PermissionModel} permission
     * @return {void}
     * @memberof PermissionPickerComponent
     */
    @action unselectPermission(permission) {
        return this.selectPermission(permission, false);
    }

    /**
     * Toggles a permission as selected.
     *
     * @param {PermissionModel} permission
     * @param {Boolean} selected
     * @return {void}
     * @memberof PermissionPickerComponent
     */
    @action selectPermission(permission, selected = true) {
        const { onChange } = this.args;

        if (selected) {
            this.selected.pushObject(permission);
        } else {
            this.selected.removeObject(permission);
        }

        permission.setProperties({ selected });

        if (typeof onChange === 'function') {
            onChange(this.selected);
        }
    }

    /**
     * Performs a query on permission from the store.
     *
     * @param {String|null} query
     * @return {Promise}
     * @memberof PermissionPickerComponent
     */
    @action queryPermissions(query = null) {
        this.isLoading = true;

        return this.store
            .query('permission', { query, guard_name: this.guard, limit: -1 })
            .then((permissions) => {
                this.isPermissionsLoaded = true;
                this.permissions = this.togglePermissions(permissions);

                return this.permissions;
            })
            .catch((error) => {
                this.notifications.serverError(error);
                this.permissions = [];
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    /**
     * Toggle the permission selected flag if selected.
     *
     * @param {Array} permissions
     * @return {Array}
     * @memberof PermissionPickerComponent
     */
    @action togglePermissions(permissions) {
        return permissions.map((permission) => {
            permission.set('selected', this.ids.includes(permission.id));
            return permission;
        });
    }

    /**
     * Task initiates the search for permissions
     *
     * @param {InputEvent} { target: { value } }
     * @return {void}
     * @memberof PermissionPickerComponent
     */
    @task({ restartable: true }) *search({ target: { value } }) {
        // if no query don't search
        if (isBlank(value)) {
            return;
        }

        // query on permissions
        this.permissions = yield this.queryPermissions(value);
    }
}
