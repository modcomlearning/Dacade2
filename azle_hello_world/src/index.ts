import { query, update, Canister, text, Record, StableBTreeMap, Ok, None, Some, Err, Vec, Result, nat64, ic, Opt, Variant } from 'azle';
import { v4 as uuidv4 } from 'uuid';

/**
 * This type represents a message that can be listed on a board.
 */
const Message = Record({
    id: text,
    title: text,
    body: text,
    attachmentURL: text,
    createdAt: nat64,
    updatedAt: Opt(nat64)
});

const MessagePayload = Record({
    title: text,
    body: text,
    attachmentURL: text
});

const Error = Variant({
    NotFound: text,
    InvalidPayload: text,
});

/**
 * `messagesStorage` - it's a key-value datastructure that is used to store messages.
 * {@link StableBTreeMap} is a self-balancing tree that acts as a durable data storage that keeps data across canister upgrades.
 * For the sake of this contract we've chosen {@link StableBTreeMap} as a storage for the next reasons:
 * - `insert`, `get` and `remove` operations have a constant time complexity - O(1)
 * - data stored in the map survives canister upgrades unlike using HashMap where data is stored in the heap and it's lost after the canister is upgraded
 * 
 * Brakedown of the `StableBTreeMap(text, Message)` datastructure:
 * - the key of map is a `messageId`
 * - the value in this map is a message itself `Message` that is related to a given key (`messageId`)
 * 
 * Constructor values:
 * 1) text - the type of the key in the map
 * 2) Message - the type of the value in the map.
 * 3) 0 - memory id where to initialize a map.
 */
const messagesStorage = StableBTreeMap(text, Message, 0);

export default Canister({
    getMessages: query([], Result(Vec(Message), Error), () => {
        return Ok(messagesStorage.values());
    }),


    getMessage: query([text], Result(Message, Error), (id) => {
        const messageOpt = messagesStorage.get(id);
        if ("None" in messageOpt) {
            return Err({ NotFound: `the message with id=${id} not found` });
        }
        return Ok(messageOpt.Some);
    }),


    addMessage: update([MessagePayload], Result(Message, Error), (payload) => {
        const message = { id: uuidv4(), createdAt: ic.time(), updatedAt: None, ...payload };
        messagesStorage.insert(message.id, message);
        return Ok(message);
    }),


    updateMessage: update([text, MessagePayload], Result(Message, Error), (id, payload) => {
        const messageOpt = messagesStorage.get(id);
        if ("None" in messageOpt) {
            return Err({ NotFound: `couldn't update a message with id=${id}. message not found` });
        }
        const message = messageOpt.Some;
        const updatedMessage = { ...message, ...payload, updatedAt: Some(ic.time()) };
        messagesStorage.insert(message.id, updatedMessage);
        return Ok(updatedMessage);
    }),

    
    deleteMessage: update([text], Result(Message, Error), (id) => {
        const deletedMessage = messagesStorage.remove(id);
        if ("None" in deletedMessage) {
            return Err({ NotFound: `couldn't delete a message with id=${id}. message not found` });
        }
        return Ok(deletedMessage.Some);
    })
});

// a workaround to make uuid package work with Azle
globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }

        return array;
    }
};