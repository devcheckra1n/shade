
/**
 * New Relic agent configuration.
 * To enable monitoring, provide the license key and app name.
 */
exports.config = {
    app_name: ['Shade Project'],
    license_key: process.env.NEW_RELIC_LICENSE_KEY || '',
    logging: {
        level: 'info'
    }
};
