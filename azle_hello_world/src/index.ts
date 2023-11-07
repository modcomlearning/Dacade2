import { query, update, Canister, text, Record, StableBTreeMap, Ok, None, Some, Err, Vec, Result, nat64, ic, Opt, Variant } from 'azle';
import { v4 as uuidv4 } from 'uuid';

const MessagePayload = Record({
    title: text,
    body: text,
    attachmentURL: text,
    author: text,  // Additional field
    category: text, // Additional field
    // Add more additional fields as needed
    // Example: date: text,
});

const Message = Record({
    id: text,
    title: text,
    body: text,
    attachmentURL: text,
    createdAt: nat64,
    updatedAt: Opt(nat64),
    author: text,  // Additional field
    category: text, // Additional field
    // Add more additional fields as needed
    // Example: date: text,
});

const Error = Variant({
    NotFound: text,
    InvalidPayload: text,
});

const messagesStorage = StableBTreeMap(text, Message, 0);

export default Canister({
    addMessage: update([MessagePayload], Result(Message, Error), (payload) => {
        const message = { id: uuidv4(), createdAt: ic.time(), updatedAt: None, ...payload };
        messagesStorage.insert(message.id, message);
        return Ok(message);
    }),

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
    }),

    // New Function 1: Get messages by author
    getMessagesByAuthor: query([text], Result(Vec(Message), Error), (author) => {
        const messagesByAuthor = messagesStorage.values().filter((message) => message.author === author);
        return Ok(messagesByAuthor);
    }),

    // New Function 2: Get messages by category
    getMessagesByCategory: query([text], Result(Vec(Message), Error), (category) => {
        const messagesByCategory = messagesStorage.values().filter((message) => message.category === category);
        return Ok(messagesByCategory);
    }),

    // New Function 3: Update message category by ID
    updateMessageCategory: update([text, text], Result(Message, Error), (id, category) => {
        const messageOpt = messagesStorage.get(id);
        if ("None" in messageOpt) {
            return Err({ NotFound: `couldn't update the category of a message with id=${id}. Message not found` });
        }
        const message = messageOpt.Some;
        const updatedMessage = { ...message, category, updatedAt: Some(ic.time()) };
        messagesStorage.insert(message.id, updatedMessage);
        return Ok(updatedMessage);
    }),

    // New Function 4: Get messages by date range
    getMessagesByDateRange: query([nat64, nat64], Result(Vec(Message), Error), (startDate, endDate) => {
        const messagesByDateRange = messagesStorage.values().filter((message) =>
            message.createdAt >= startDate && (message.updatedAt ? message.updatedAt.Some : message.createdAt) <= endDate
        );
        return Ok(messagesByDateRange);
    }),

    // New Function 5: Delete messages by author
    deleteMessagesByAuthor: update([text], Result(Vec(Message), Error), (author) => {
        const deletedMessages = messagesStorage.values().filter((message) => message.author === author);
        deletedMessages.forEach((message) => messagesStorage.remove(message.id));
        return Ok(deletedMessages);
    }),

    // New Function 6: Get the total count of messages
    getMessageCount: query([], nat64, () => {
        return Ok(messagesStorage.size());
    }),

    // New Function 7: Update message title by ID
    updateMessageTitle: update([text, text], Result(Message, Error), (id, title) => {
        const messageOpt = messagesStorage.get(id);
        if ("None" in messageOpt) {
            return Err({ NotFound: `couldn't update the title of a message with id=${id}. Message not found` });
        }
        const message = messageOpt.Some;
        const updatedMessage = { ...message, title, updatedAt: Some(ic.time()) };
        messagesStorage.insert(message.id, updatedMessage);
        return Ok(updatedMessage);
    }),

    // New Function 8: Get the latest updated messages
    getLatestUpdatedMessages: query([], Result(Vec(Message), Error), () => {
        const latestUpdatedMessages = messagesStorage.values().filter((message) => message.updatedAt !== None);
        return Ok(latestUpdatedMessages);
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
