import Component from '@glimmer/component';

/**
 * Table cell showing whether a user's email or phone is verified. The column's
 * `valuePath` is the verified-at date and `contactPath` the email/phone it
 * belongs to, so a user without that contact shows a dash instead.
 */
export default class TableCellVerificationStatusComponent extends Component {}
