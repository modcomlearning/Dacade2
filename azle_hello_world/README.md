To start please run below command
`
 npm install uuid
`

Code Expanations
Below code specifies the Model of the Record to be Saved, we save only 3 items.
` 
const Message = Record({ 
    id: text,
    title: text,
    body: text,
    attachmentURL: text,
    createdAt: nat64,
    updatedAt: Opt(nat64)
});

`


When the message is Saved we also save additional fields such as created time etc.
Below code shows how a Record will be retrieved.

`
const Message = Record({
    id: text,
    title: text,
    body: text,
    attachmentURL: text,
    createdAt: nat64,
    updatedAt: Opt(nat64)
});
`
Incase of an Error, you can get two scenarios namely; NotFound or Invalid Payload
We define a model to represent that in below Code.

`
const Error = Variant({
    NotFound: text,
    InvalidPayload: text,
});
`









