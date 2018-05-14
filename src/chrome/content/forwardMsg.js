// msgComposeService -> MailServices.compose
//Components.utils.import("resource:///modules/mailServices.js");
ChromeUtils.import("resource:///modules/mailServices.js");  // 60.0+

var gForwardGlobalInitiated = false;
var accountManager;
var RDF;
var messenger;
var msgWindow;


function initForwardGlobals()
{
  accountManager = Components.classes['@mozilla.org/messenger/account-manager;1'].getService(Components.interfaces.nsIMsgAccountManager);
  
  RDF = Components.classes['@mozilla.org/rdf/rdf-service;1'].getService();
  RDF = RDF.QueryInterface(Components.interfaces.nsIRDFService);
  
  messenger = Components.classes['@mozilla.org/messenger;1'].createInstance();
  messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);
  
  msgWindow = Components.classes['@mozilla.org/messenger/msgwindow;1'].createInstance();
  msgWindow = msgWindow.QueryInterface(Components.interfaces.nsIMsgWindow);
  
  gForwardGlobalInitiated = true;
}


function csMsgForwardMessage(attachments)
{
  if (!gForwardGlobalInitiated)
    initForwardGlobals();

  var messageArray = [];
  if (attachments[0])
    for (var i = 0; i<attachments.length; i++)
      messageArray[i] = attachments[i].url;
  else
    messageArray[0] = attachments.url;
  
  var forwardType = nsPreferences.getIntPref("mail.forward_message_mode", 0);
  
  // mail.forward_message_mode could be 1, if the user migrated from 4.x
  // 1 (forward as quoted) is obsolete, so we treat is as forward inline
  // since that is more like forward as quoted then forward as attachment
  
  // Forard inline is not (yet?) working. Disabled for now
//  if (forwardType == 0)
    MsgForwardAsAttachment(messageArray);
//  else
//    MsgForwardAsInline(messageArray);
}


function MsgForwardAsAttachment(messageArray)
{
  ComposeMessage(msgComposeType.ForwardAsAttachment, 
                 msgComposeFormat.Default, messageArray);
}


function MsgForwardAsInline(messageArray)
{
  ComposeMessage(msgComposeType.ForwardInline, 
                 msgComposeFormat.Default, messageArray);
}


// type is a nsIMsgCompType and format is a nsIMsgCompFormat
function ComposeMessage(type, format, messageArray)
{
  var msgComposeType = Components.interfaces.nsIMsgCompType;
  var identity = null;
  var server;

  messenger.SetWindow(window, msgWindow);

  var uri = null;
  var object = null;
 
  if (messageArray && messageArray.length > 0)
  {
    uri = "";
    for (var i = 0; i < messageArray.length; i ++)
    { 
      var messageUri = messageArray[i];
      var hdr = messenger.messageServiceFromURI(messageUri).messageURIToMsgHdr(messageUri);
      var hintForIdentity = hdr.recipients + hdr.ccList;

      server = window.parent.GetSelectedServer();
      if (server)
        identity = getIdentityForServer(server, hintForIdentity);

      if (!identity || hintForIdentity.search(identity.email) < 0)
      {
        var accountKey = hdr.accountKey;
        if (accountKey.length > 0)
        {
          var account = accountManager.getAccount(accountKey);
          if (account)
          {
            server = account.incomingServer;
            if (server)
              identity = getIdentityForServer(server, hintForIdentity);
          }
        }
      }

      if (type == msgComposeType.ForwardInline)
      {
        // if the addressbook sidebar panel is open and has focus, get
        // the selected addresses from it
        if (document.commandDispatcher.focusedWindow
           .document.documentElement.hasAttribute("csSelectedAddresses"))
        {
          ForwardMessageToSelectedAddresses(type, format, identity, messageUri);
        }
        else
        {
          MailServices.compose.OpenComposeWindow(null, messageUri, type, format, identity, msgWindow);
        }
        
        //limit the number of new compose windows to 8. Why 8? I like that number :-)
        if (i == 7)
          break;
      }
      else
      {
        if (i) 
          uri += ",";
        uri += messageUri;
      }
    }

    if (type == msgComposeType.ForwardAsAttachment)
    {
      // if the addressbook sidebar panel is open and has focus, get
      // the selected addresses from it
      if (document.commandDispatcher.focusedWindow
         .document.documentElement.hasAttribute("csSelectedAddresses"))
      {
        ForwardMessageToSelectedAddresses(type, format, identity, uri);
      }
      else
      {
        MailServices.compose.OpenComposeWindow(null, uri, type, format, identity, msgWindow);
      }
    }
  }
  else
    dump("### nodeList is invalid\n");
}


function ForwardMessageToSelectedAddresses(type, format, identity, uri) 
{
  var abSidebarPanel = document.commandDispatcher.focusedWindow;
  var abResultsTree = abSidebarPanel.document.getElementById("abResultsTree");
  var abResultsBoxObject = abResultsTree.treeBoxObject;
  var abView = abResultsBoxObject.view;
  abView = abView.QueryInterface(Components.interfaces.nsIAbView);
  var addresses = abView.selectedAddresses;
  var params = Components.classes['@mozilla.org/messengercompose/composeparams;1']
                         .createInstance(Components.interfaces.nsIMsgComposeParams);
  
  if (params) 
  {
    params.type = type; //3 = attachment; 4 = inline
    params.format = format;
    params.identity = identity;
    params.originalMsgURI = uri;
    var composeFields = Components.classes['@mozilla.org/messengercompose/composefields;1']
                                  .createInstance(Components.interfaces.nsIMsgCompFields);
    if (composeFields) 
    {
      var addressList = "";
      for (var i = 0; i < addresses.Count(); i++) 
      {
        addressList = addressList + (i > 0 ? ",":"") + 
          addresses.QueryElementAt(i, Components.interfaces.nsISupportsString).data;
      }
      composeFields.to = addressList;
      params.composeFields = composeFields;
      MailServices.compose.OpenComposeWindowWithParams(null, params);
    }
  }
}
