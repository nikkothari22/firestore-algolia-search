'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const logs = require("./logs");
const processors_1 = require("./processors");
const util_1 = require("./util");
const PAYLOAD_MAX_SIZE = 102400;
const PAYLOAD_TOO_LARGE_ERR_MSG = 'Record is too large.';
const trim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
const getPayload = (snapshot) => {
    const payload = {
        objectID: snapshot.id,
    };
    const fields = util_1.getFields(config_1.default);
    if (fields.length === 0) {
        return {
            ...processors_1.dataProcessor(snapshot.data()),
            ...payload,
        };
    }
    // Fields have been defined by user.  Start pulling data from the document to create payload
    // to send to Algolia.
    fields.forEach(item => {
        let firebaseField = item.replace(trim, '');
        const [field, value] = processors_1.valueProcessor(firebaseField, snapshot.get(firebaseField));
        logs.debug('field', field);
        logs.debug('value', value);
        if (util_1.isValidValue(value)) {
            payload[field] = value;
        }
        else {
            logs.fieldNotExist(firebaseField);
        }
    });
    return payload;
};
function extract(snapshot, timestamp) {
    // Check payload size and make sure its within limits before sending for indexing
    const payload = getPayload(snapshot);
    if (util_1.getObjectSizeInBytes(payload) < PAYLOAD_MAX_SIZE) {
        return {
            ...payload,
            lastmodified: {
                _operation: 'IncrementSet',
                value: timestamp,
            },
        };
    }
    else {
        throw new Error(PAYLOAD_TOO_LARGE_ERR_MSG);
    }
}
exports.default = extract;
