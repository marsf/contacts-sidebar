// msgComposeService -> MailServices.compose
//Components.utils.import("resource:///modules/mailServices.js");
ChromeUtils.import("resource:///modules/mailServices.js");  // 60.0+

var gCollapsedContactsViewMode = false;
var msgComposeFormat = Components.interfaces.nsIMsgCompFormat;
var msgComposeType = Components.interfaces.nsIMsgCompType;

var gAddressBookBundle;
var gAccountManager;
var gIOService;
var gUseMultipleComposers;
var gStatusText = null;

function InitializeGlobalVariables()
{
  initCommon();
  
  gAccountManager = Components.classes['@mozilla.org/messenger/account-manager;1'].getService(Components.interfaces.nsIMsgAccountManager);
  gIOService = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
  
  gAddressBookBundle = document.getElementById("bundle_addressBook");
  csAddPrefObservers();
  
  gUseMultipleComposers = nsPreferences.getBoolPref("contactssidebar.multiple_composers", false);
}


function ReleaseGlobalVariables()
{
  gAccountManager = null;
  gIOService = null;
}


function ToggleContactsView() {
  var expandedNode = document.getElementById("expandedContactsView");
  var collapsedNode = document.getElementById("collapsedContactsView");
  var toggleContactsView = document.getElementById("contactsView");

  if (gCollapsedContactsViewMode) {
    gCollapsedContactsViewMode = false;

    // now uncollapse / collapse the right views
    expandedNode.collapsed = false;
    collapsedNode.collapsed = true;
  } else {
    gCollapsedContactsViewMode = true;

    // now uncollapse / collapse the right views
    collapsedNode.collapsed = false;
    expandedNode.collapsed = true;
  }  

  if (gCollapsedContactsViewMode)
    toggleContactsView.setAttribute("state", "true");
  else
    toggleContactsView.setAttribute("state", "false");
}


function contactsPanelLoad() {
  InitializeGlobalVariables();
  csLoad();
  document.loadBindingDocument('chrome://global/content/bindings/textbox.xml');
  
  setMenuOptionsVisibility();
  
  document.getElementById("cardProperties").addEventListener("popupshowing", setContext, false);
  
  var expandedNode = document.getElementById("expandedContactsView");
  if (expandedNode.collapsed)
    ToggleContactsView();
}


function contactsPanelUnload() {
  csRemovePrefObservers();
  ReleaseGlobalVariables();
  document.getElementById("cardProperties").removeEventListener("popupshowing", setContext, false);

  document.persist("collapsedContactsView", "collapsed");
  document.persist("expandedContactsView", "collapsed");

  // AbPanelUnload() contains specific compose window code.
  // Copy the (useful) code from AbPanelUnLoad.
  Components.classes["@mozilla.org/abmanager;1"]
  			.getService(Components.interfaces.nsIAbManager)
  			.removeAddressBookListener(gAddressBookPanelAbListener);
  CloseAbView();
}


function csLoad()
{
  InitCommonJS();
  gAddressBookBundle = document.getElementById("bundle_addressBook");

  LoadPreviouslySelectedAB();

  // Add a listener, so we can switch directories if the current directory is
  // deleted. This listener cares when a directory (= address book), or a
  // directory item is/are removed. In the case of directory items, we are
  // only really interested in mailing list changes and not cards but we have
  // to have both.
  Components.classes["@mozilla.org/abmanager;1"]
            .getService(Components.interfaces.nsIAbManager)
            .addAddressBookListener(gAddressBookPanelAbListener,
                                    Components.interfaces.nsIAbListener.directoryRemoved |
                                    Components.interfaces.nsIAbListener.directoryItemRemoved);

  gSearchInput = document.getElementById("peopleSearchInput");
}


function contactsComposeMessage(type, format, recipientType, useSecondEmail, attachments, subject)
{
  var msgComposeType = Components.interfaces.nsIMsgCompType;
  var msgComposFormat = Components.interfaces.nsIMsgCompFormat;
  var params = Components.classes['@mozilla.org/messengercompose/composeparams;1'].createInstance(Components.interfaces.nsIMsgComposeParams);
  if (params)
  {
    params.type = type;
    params.format = msgComposFormat.Default;
    var composeFields = Components.classes['@mozilla.org/messengercompose/composefields;1'].createInstance(Components.interfaces.nsIMsgCompFields);
    if (composeFields) 
    {
      gUseSecondEmail = useSecondEmail;
      var addresses = GetSelectedAddresses();
      switch (recipientType) {
        case 'addr_to': 
          composeFields.to = addresses;
          break;
        case 'addr_cc': 
          composeFields.cc = addresses;
          break;
        case 'addr_bcc': 
          composeFields.bcc = addresses;
          break;
      }
      // Add attachment
      if (attachments)
      {
        if (attachments[0])
          for (var i=0; i<attachments.length; i++)
            composeFields.addAttachment(attachments[i]);
        else
          composeFields.addAttachment(attachments);
      }
      
      if (subject)
        composeFields.subject = subject;
        
      var identity;
      var selectedServer = csGetSelectedServer();
      if (selectedServer)
        identity = gAccountManager.getFirstIdentityForServer(selectedServer);
      if (!identity)
        identity = gAccountManager.defaultAccount.defaultIdentity;
      if (identity)
        params.identity = identity;
      
      params.composeFields = composeFields;
      params.format = format;
      
      MailServices.compose.OpenComposeWindowWithParams(null, params);
    }
  }
}


// From the current folder tree, return the selected server
// Made my own implementation instead of using window.parent.GetSelectedServer(), as
// this call does not work when the ConQuery extension is installed.
function csGetSelectedServer() {
	var server = null;
    var folderURI = csGetSelectedFolderURI();
    if (folderURI)
    	server = GetServer(folderURI);
    
    return server;
}


function csGetSelectedFolderURI()
{ 
//tb3 porting
    //var curFolder = top.GetSelectedFolderURI();
    //return curFolder;
    return null;
}


var contactsTreeObserver = {

  canHandleMultipleItems: true,

  onDrop: function (aEvent, aData, aDragSession)
    {
      var attachments = [];
      var k = 0;

      csOnClick(aEvent);

      var dataList = aData.dataList;
      var dataListLength = dataList.length;
      var attachment;
      
      for (var i = 0; i < dataListLength; i++) 
      {
        var item = dataList[i].first;
        var prettyName;
        var rawData = item.data;
        var type = msgComposeType.New;
        
        if (item.flavour.contentType == "text/x-moz-url" ||
            item.flavour.contentType == "text/x-moz-message" ||
            item.flavour.contentType == "application/x-moz-file")
        {
          if (item.flavour.contentType == "application/x-moz-file")
          {
            var ioService = Components.classes['@mozilla.org/network/io-service;1']
                            .getService(Components.interfaces.nsIIOService);
            var fileHandler = ioService.getProtocolHandler("file")
                              .QueryInterface(Components.interfaces.nsIFileProtocolHandler);
            rawData = fileHandler.getURLSpecFromFile(rawData);
          }
          else if (item.flavour.contentType == "text/x-moz-url")
          {
            var separator = rawData.indexOf("\n");
            if (separator != -1) 
            {
              prettyName = rawData.substr(separator+1);
              rawData = rawData.substr(0,separator);
            }
          }

          var isValid = true;
          if (item.flavour.contentType == "text/x-moz-url" ||
              item.flavour.contentType == "text/x-moz-message") {
            // if this is a url (or selected text) see if it's a valid url by checking 
            // if we can extract a scheme using the ioservice
            //
            // also skip mailto: since it doesn't make sense to attach and send mailto urls
            try {
              var scheme = gIOService.extractScheme(rawData);
              // don't attach mailto: urls
              if (scheme == "mailto")
                isValid = false;
            }
            catch (ex) {
              isValid = false;
            }
            if (isValid) {
              attachment = Components.classes['@mozilla.org/messengercompose/attachment;1']
                                    .createInstance(Components.interfaces.nsIMsgAttachment);
              attachment.url = rawData;
              attachment.name = prettyName;
              attachments[k++] = attachment;
              
              if (gUseMultipleComposers)
              {
                if (item.flavour.contentType == "text/x-moz-message")
                {
                  csMsgForwardMessage(attachment);
                }
                else
                  contactsComposeMessage(type, msgComposeFormat.Default, 'addr_to', false, attachment);
              }
            }
          }
        }
      }
    
      if (!gUseMultipleComposers)
      {
        if (item.flavour.contentType == "text/x-moz-message")
          csMsgForwardMessage(attachments);
        else        
          contactsComposeMessage(type, msgComposeFormat.Default, 'addr_to', false, attachments);
      }
    },

  onDragOver: function (aEvent, aFlavour, aDragSession)
    {
      gContactsTree.setAttribute("dragover", "true");
      
      // Select row (if valid)
      isValidRow(aEvent, true);
    },

  onDragExit: function (aEvent, aDragSession)
    {
      gContactsTree.removeAttribute("dragover");
    },

  getSupportedFlavours: function ()
    {
      var flavourSet = new FlavourSet();
      flavourSet.appendFlavour("text/x-moz-url");
      flavourSet.appendFlavour("text/x-moz-message");
      flavourSet.appendFlavour("application/x-moz-file", "nsIFile");
      return flavourSet;
    }
};


function forwardContact() {
  var forwardInfo = GetForwardContactInfo();
  var attachments = new Array( forwardInfo.attachment );

  contactsComposeMessage(msgComposeType.New, msgComposeFormat.Default, 'none', false, attachments, forwardInfo.subject);
}


function copyContact(destABook)
{
  var destURI = destABook.getAttribute('id');
  var directory = GetDirectoryFromURI(destURI);

  var cards = GetSelectedAbCards();
  
  if (!cards)
    return;
    
  var count = cards.length;
  for (var i = 0; i < count; i++) 
  {
    if (cards[i].isMailList)
    {
      var mailList = GetDirectoryFromURI(cards[i].mailListURI);
      directory.addMailList(mailList);
/*
 test: copy the maillist members "by hand"
 
      var mailList = GetDirectoryFromURI(cards[i].mailListURI);
      while (mailList.childNodes.hasMoreElements() )
      {
        var currentCard = mailList.childNodes.getNext().QueryInterface(Components.interfaces.nsIAbCard);
        directory.dropCard(currentCard, true);
      }
*/      
    }
    else
      directory.dropCard(cards[i], true);
  }
  
}


var gAddressBookAbViewListener = {
  onSelectionChanged: function() {
    ResultsPaneSelectionChanged();
  },
  onCountChanged: function( total ) {
    SetStatusText( total );
  }
};


function GetAbViewListener()
{
  return gAddressBookAbViewListener;
}


function ResultsPaneSelectionChanged()
{
  // Nothing to do for the sidebar
}

function SetStatusText( total )
{
  if (!gStatusText)
    gStatusText = top.document.getElementById('statusText');

  try {
    var statusText;

    //if (gSearchInput && gSearchInput.value) {
    if ( isValidSearchQuery() || gSearchInput.searchMode === 4 )
    {
      if (total === 0)
        statusText = gAddressBookBundle.getString("noMatchFound");
      else
      {
        if (total === 1)
          statusText = gAddressBookBundle.getString("matchFound");
        else
          statusText = gAddressBookBundle.getFormattedString("matchesFound", [total]);
      }
    }
    else
    {
      // Only clear the status text if the text is search result text (or only clear text we put there ourselfs)

      // Strip the numbers and the number placeholders from the strings 
      // to make this compare work for other locales
      var noMatchStr = gAddressBookBundle.getString("noMatchFound");
      var oneMatchStr = StripToken( gAddressBookBundle.getString("matchFound"), "1" );
      var multiMatchStr = StripToken( gAddressBookBundle.getString("matchesFound"), "%S" );

      var curText = StripToken( gStatusText.getAttribute( "label" ), "\\d*" );
      if ( curText == noMatchStr || curText == oneMatchStr || curText == multiMatchStr )
        statusText = " ";
    }

    if ( statusText )
      gStatusText.setAttribute("label", statusText);
  }
  catch(ex) {
    dump("failed to set status text:  " + ex + "\n");
  }
}

var gAddressBookPanelAbListener = {
  onItemAdded: function(parentDir, item) {
    // will not be called
  },
  onItemRemoved: function(parentDir, item) {
    // will only be called when an addressbook is deleted
    try {
      var directory = item.QueryInterface(Components.interfaces.nsIAbDirectory);
      // check if the item being removed is the directory
      // that we are showing in the addressbook sidebar
      // if so, select the person addressbook (it can't be removed)
      if (directory == GetAbView().directory) {
          var abPopup = document.getElementById('addressbookList');
          abPopup.value = kPersonalAddressbookURI;
          LoadPreviouslySelectedAB();
      }
    }
    catch (ex) {
    }
  },
  onItemPropertyChanged: function(item, property, oldValue, newValue) {
    try {
      var directory = item.QueryInterface(Components.interfaces.nsIAbDirectory);
      // check if the item being changed is the directory
      // that we are showing in the addressbook sidebar
      if (directory == GetAbView().directory) {
          LoadPreviouslySelectedAB();
      }
    }
    catch (ex) {
    }
  }
};

function LoadPreviouslySelectedAB()
{
  var abPopup = document.getElementById('addressbookList');
  var value = abPopup.value || kPersonalAddressbookURI;
  abPopup.selectedItem = null;
  abPopup.value = value;
  if (!abPopup.selectedItem)
    abPopup.selectedIndex = 0;
  ChangeDirectoryByURI(abPopup.value);
}
