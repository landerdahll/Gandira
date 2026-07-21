"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDemoEmailMode = isDemoEmailMode;
exports.maskEmail = maskEmail;
function isDemoEmailMode(config) {
    return config.get('DEMO_EMAIL_MODE', 'false').trim().toLowerCase() === 'true';
}
function maskEmail(email) {
    const [local = '', domain = ''] = email.split('@');
    const maskedLocal = local ? `${local[0]}***` : '***';
    const [domainName = '', ...suffix] = domain.split('.');
    const maskedDomain = domainName ? `${domainName[0]}***` : '***';
    return `${maskedLocal}@${maskedDomain}${suffix.length ? `.${suffix.join('.')}` : ''}`;
}
//# sourceMappingURL=demo-email.util.js.map