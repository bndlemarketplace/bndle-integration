module.exports = {
  model: {
    user: {
      defaultUserRole: 'user',
      statusEnum: ['active', 'inactive'],
      defaultStatus: 'active',
      socialLoginTypeEnum: ['facebook', 'google', 'apple'],
      typeOfAccountEnum: ['email', 'apple', 'google', 'facebook'],
      defaultTypeOfAccount: 'email',
      connectionTypeEnum: ['shopify', 'wix', 'woocommerce', 'squarespace'],
    },
    customer: {
      genderEnum: {
        MALE: 'MALE',
        FEMALE: 'FEMALE',
        NON_BINARY: 'NON_BINARY',
        TO_BE_CONFIRMED: 'TO_BE_CONFIRMED',
      },
      mailPreferencesEnum: [
        { value: 'discountsAndSales', id: 'R8VYjc', isSelected: true },
        { value: 'bndleAndPartners', id: 'QYgHEL', isSelected: true },
        { value: 'exclusives', id: 'U5kWBn', isSelected: true },
        { value: 'newStuff', id: 'WeU7Gi', isSelected: true },
      ],
      socialChannels: ['FACEBOOK', 'GOOGLE', 'EMAIL'],
      // 'bndleAndPartners', 'exclusives', 'newStuff'],
    },
    product: {
      productSourceEnum: ['direct', 'shopify', 'wix', 'woocommerce', 'squarespace'],
      statusproductEnum: ['active', 'inactive', 'publish', 'unpublish'],
      STATUS: ['PUBLISHED', 'UNPUBLISHED', 'ENABLED', 'DISABLED', 'REJECTED', 'IMPORTED'],
      venderStatus: ['ENABLED', 'DISABLED'],
      SPECIAL_TAGS: {
        feature: 'FEATURE',
        bestSeller: 'BEST_SELLER',
        hot: 'HOT',
        newArrival: 'NEW_ARRIVALS',
        trending: 'TRENDING',
        sale: 'SALE',
      },
    },
    order: {
      orderStatus: {
        NEW: 'NEW',
        PARTIALLY_ON_HOLD: 'PARTIALLY_ON_HOLD',
        ON_HOLD: 'ON_HOLD',
        PARTIALLY_REQUEST_DECLINED: 'PARTIALLY_REQUEST_DECLINED',
        REQUEST_DECLINED: 'REQUEST_DECLINED',
        PARTIALLY_SHIPPED: 'PARTIALLY_SHIPPED',
        SHIPPED: 'SHIPPED',
        PARTIALLY_RETURNED: 'PARTIALLY_RETURNED',
        RETURNED: 'RETURNED',
        PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
        REFUNDED: 'REFUNDED',
        PARTIALLY_RETURN_IN_PROGRESS: 'PARTIALLY_RETURN_IN_PROGRESS',
        RETURN_IN_PROGRESS: 'RETURN_IN_PROGRESS',
      },
      vendorOrderStatus: {
        NEW: 'NEW',
        ON_HOLD: 'ON_HOLD',
        REQUEST_DECLINED: 'REQUEST_DECLINED',
        PARTIALLY_ON_HOLD: 'PARTIALLY_ON_HOLD',
        PARTIALLY_SHIPPED: 'PARTIALLY_SHIPPED',
        SHIPPED: 'SHIPPED',
      },
    },
    logger: {
      typeEnum: ['sync', 'publish'],
      levelEnum: ['error', 'warn', 'info', 'verbose', 'debug'],
    },
  },
  config: {
    roles: {
      adminRoles: ['getUsers', 'manageUsers'],
      vendor: ['getUsers'],
    },
  },
};
