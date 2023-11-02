import { query, update, Canister, text, Record, StableBTreeMap, Ok, None, Some, Err, Vec, Result, nat64, ic, Opt, Variant } from 'azle';
//TODO : npm install uuid
import { v4 as uuidv4 } from 'uuid';

/**
 * This type represents a message that can be listed on a board.
 */

//below we create a Model to represent how a message is  Saved, note we save only 3 fields/Payload
//additional fields such createdTime, updatedTime are added automatically
const MessagePayload = Record({
    title: text,
    body: text,
    attachmentURL: text
});


//Below we create a Model to represent How a message is Retrieved
const Message = Record({
    id: text,
    title: text,
    body: text,
    attachmentURL: text,
    createdAt: nat64,
    updatedAt: Opt(nat64)
});

//In the event there is an Error, we create a model to represent 2 possible outcomes
//one could be Not Found, the other is Invalid Payload provided
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
 * SPecify our messageStorage  Object 
 * Constructor values:
 * 1) text - the type of the key in the map
 * 2) Message - the type of the value in the map.
 * 3) 0 - memory id where to initialize a map.
 */
const messagesStorage = StableBTreeMap(text, Message, 0);

export default Canister({

    //Below we add the Message to mesageStorage
    addMessage: update([MessagePayload], Result(Message, Error), (payload) => {
        //generate uuid, create and update time and our payload
        const message = { id: uuidv4(), createdAt: ic.time(), updatedAt: None, ...payload };
        //Insert the message
        messagesStorage.insert(message.id, message);
        //return an OK with the message you saved
        return Ok(message);
    }),

    //Below we get all messages from the storage
    getMessages: query([], Result(Vec(Message), Error), () => {
        return Ok(messagesStorage.values());
    }),

    //we get specific message from the message storage, we provide the uuid
    getMessage: query([text], Result(Message, Error), (id) => {
        const messageOpt = messagesStorage.get(id);
        if ("None" in messageOpt) {
            return Err({ NotFound: `the message with id=${id} not found` });
        }
        return Ok(messageOpt.Some);
    }),

    //Update a message already in the messageStorage, we provide a uuid
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

    //delete a message from the messageStorage, we provide a uuid to remove
    deleteMessage: update([text], Result(Message, Error), (id) => {
        const deletedMessage = messagesStorage.remove(id);
        if ("None" in deletedMessage) {
            return Err({ NotFound: `couldn't delete a message with id=${id}. message not found` });
        }
        return Ok(deletedMessage.Some);
    })
});

// NB: Below is a workaround to make uuid package work with Azle
//This function must be placed here. to enable uuid work in this code
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

//Student Todo: 
//Modify above code to save different fields other than attachmentUrl, title and body