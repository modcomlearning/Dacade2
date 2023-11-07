import { query, update, Canister, text, Record, StableBTreeMap, Ok, None, Some, Err, Vec, Result, nat64, ic, Opt, Variant, validate, validateUUID } from 'azle';
import { v4 as uuidv4 } from 'uuid';

const MessagePayload = Record({
    title: text,
    body: text,
    attachmentURL: text,
    // Add additional fields here
    createdAt: nat64, // Example additional field
});

const Message = Record({
    id: text,
    title: text,
    body: text,
    attachmentURL: text,
    createdAt: nat64,
    updatedAt: Opt(nat64),
    // Add additional fields here
    author: text, // Example additional field
});

const Error = Variant({
    NotFound: text,
    InvalidPayload: text,
});

const messagesStorage = StableBTreeMap(text, Message, 0);

export default Canister({
    addMessage: update([MessagePayload], Result(Message, Error), (payload) => {
        // Validate the UUID
        if (!validateUUID(payload.id)) {
            return Ok({ id: '', createdAt: 0, ...payload, updatedAt: None });
        }
        
        const message = { id: uuidv4(), createdAt: ic.time(), updatedAt: None, ...payload };
        messagesStorage.insert(message.id, message);
        return Ok(message);
    }),

    getMessages: query([nat64, nat64], Result(Vec(Message), Error), (offset, limit) => {
        const messages = messagesStorage.values();
        const paginatedMessages = messages.slice(offset, offset + limit);
        return Ok(paginatedMessages);
    }),

    getMessage: query([text], Result(Message, Error), (id) => {
        const messageOpt = messagesStorage.get(id);
        if ("None" in messageOpt) {
            return Err({ NotFound: `The message with id=${id} not found` });
        }
        return Ok(messageOpt.Some);
    }),

    updateMessage: update([text, MessagePayload], Result(Message, Error), (id, payload) => {
        if (!validateUUID(id)) {
            return Err({ NotFound: `Invalid message ID: ${id}` });
        }

        const messageOpt = messagesStorage.get(id);
        if ("None" in messageOpt) {
            return Err({ NotFound: `Couldn't update a message with id=${id}. Message not found` });
        }

        const message = messageOpt.Some;
        const updatedMessage = { ...message, ...payload, updatedAt: Some(ic.time()) };
        messagesStorage.insert(message.id, updatedMessage);
        return Ok(updatedMessage);
    }),

    deleteMessage: update([text], Result(Message, Error), (id) => {
        if (!validateUUID(id)) {
            return Err({ NotFound: `Invalid message ID: ${id}` });
        }

        const deletedMessage = messagesStorage.remove(id);
        if ("None" in deletedMessage) {
            return Err({ NotFound: `Couldn't delete a message with id=${id}. Message not found` });
        }

        return Ok(deletedMessage.Some);
    }),
});

globalThis.crypto = {
    getRandomValues: () => {
        let array = new Uint8Array(32);
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    }
};
