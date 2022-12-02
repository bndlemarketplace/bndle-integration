/**
 * Wrapper for Restify Response API
 * */
const platformResponse = (res, options = {}) => {
    // set the status code
    res.status(options.statusCode || 200);

    // set the charSet
    res.charSet(options.charSet || 'utf-8');
    res.header('content-type', 'json');

    res.send(options.data);

};

module.exports = platformResponse;