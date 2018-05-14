// List/card selections in the results pane.
const kMultipleCardsOnly = 5;
const kSingleCardOnly = 6;

var gContactsTree;
var gSearchInput;
var gContactsPanelBundle;
var gUseSecondEmail;
var gConfirmDelete;
var gUseDefaultSearch;
var gDefaultSearch;
var gUseMultipleComposers;
var gSearchRange = new Array(false, false, false, false, false, false);
var gOldSearchMode = 0;


function initCommon()
{
  gContactsTree = document.getElementById("abResultsTree");
  gSearchInput = document.getElementById("peopleSearchInput");
  gContactsPanelBundle = srGetStrBundle("chrome://contactssidebar/locale/contactsPanel.properties");
  gAddressBookBundle = srGetStrBundle("chrome://messenger/locale/addressbook/addressBook.properties");
  gUseSecondEmail = false;
  gConfirmDelete = nsPreferences.getIntPref("confirm_delete", 1);
  
  gUseDefaultSearch = nsPreferences.getBoolPref("auto_populate", true);
  gDefaultSearch = nsPreferences.copyUnicharPref("auto_search_query", "*");
  gUseMultipleComposers = nsPreferences.getBoolPref("multiple_composers", false);
  
  gSearchRange[NAME] = nsPreferences.getBoolPref("search_name", true);
  gSearchRange[INTERNET] = nsPreferences.getBoolPref("search_internet", true);
  gSearchRange[PHONES] = nsPreferences.getBoolPref("search_phones", true);
  gSearchRange[HOME] = nsPreferences.getBoolPref("search_home", true);
  gSearchRange[WORK] = nsPreferences.getBoolPref("search_work", true);
  gSearchRange[OTHER] = nsPreferences.getBoolPref("search_other", true);
}


function csAddPrefObservers()
{
  var prefBranch = Services.prefs.getBranch("extensions.contactssidebar.");

  prefBranch.addObserver("search_mode",       ContactsSidebarPrefObserver, false);
  prefBranch.addObserver("auto_populate",     ContactsSidebarPrefObserver, false);
  prefBranch.addObserver("auto_search_query", ContactsSidebarPrefObserver, false);
  prefBranch.addObserver("show_cc_item",      ContactsSidebarPrefObserver, false);
  prefBranch.addObserver("show_bcc_item",     ContactsSidebarPrefObserver, false);
  prefBranch.addObserver("multiple_composers",ContactsSidebarPrefObserver, false);
  prefBranch.addObserver("confirm_delete",    ContactsSidebarPrefObserver, false);
  prefBranch.addObserver("search_name",       ContactsSidebarPrefObserver, false);
  prefBranch.addObserver("search_internet",   ContactsSidebarPrefObserver, false);
  prefBranch.addObserver("search_phones",     ContactsSidebarPrefObserver, false);
  prefBranch.addObserver("search_home",       ContactsSidebarPrefObserver, false);
  prefBranch.addObserver("search_work",       ContactsSidebarPrefObserver, false);
  prefBranch.addObserver("search_other",      ContactsSidebarPrefObserver, false);
}


function csRemovePrefObservers()
{
  var prefBranch = Services.prefs.getBranch("extensions.contactssidebar.");

  prefBranch.removeObserver("search_mode",       ContactsSidebarPrefObserver);
  prefBranch.removeObserver("auto_populate",     ContactsSidebarPrefObserver);
  prefBranch.removeObserver("auto_search_query", ContactsSidebarPrefObserver);
  prefBranch.removeObserver("show_cc_item",      ContactsSidebarPrefObserver);
  prefBranch.removeObserver("show_bcc_item",     ContactsSidebarPrefObserver);
  prefBranch.removeObserver("multiple_composers",ContactsSidebarPrefObserver);
  prefBranch.removeObserver("confirm_delete",    ContactsSidebarPrefObserver);
  prefBranch.removeObserver("search_name",       ContactsSidebarPrefObserver);
  prefBranch.removeObserver("search_internet",   ContactsSidebarPrefObserver);
  prefBranch.removeObserver("search_phones",     ContactsSidebarPrefObserver);
  prefBranch.removeObserver("search_home",       ContactsSidebarPrefObserver);
  prefBranch.removeObserver("search_work",       ContactsSidebarPrefObserver);
  prefBranch.removeObserver("search_other",      ContactsSidebarPrefObserver);
}


const ContactsSidebarPrefObserver =
{
  observe: function pref_observe(subject, topic, prefName) {
    // verify that we're changing the contacts sidebar config pref
    if (topic == "nsPref:changed") {
      switch (prefName)
      {
        case "auto_populate":
          gUseDefaultSearch = nsPreferences.getBoolPref(prefName, true);
          break;

        case "auto_search_query":
          gDefaultSearch = nsPreferences.copyUnicharPref(prefName, "*");
          break;

        case "show_cc_item":
        case "show_bcc_item":
          setMenuOptionsVisibility();
          break;

        case "multiple_composers":
          gUseMultipleComposers = nsPreferences.getBoolPref(prefName, true);
          break;
        case "confirm_delete":
          gConfirmDelete = nsPreferences.getIntPref(prefName, 1);
          break;
        case "search_name":
          gSearchRange[NAME] = nsPreferences.getBoolPref(prefName, true);
          break;
        case "search_internet":
          gSearchRange[INTERNET] = nsPreferences.getBoolPref(prefName, true);
          break;
        case "search_phones":
          gSearchRange[PHONES] = nsPreferences.getBoolPref(prefName, true);
          break;
        case "search_home":
          gSearchRange[HOME] = nsPreferences.getBoolPref(prefName, true);
          break;
        case "search_work":
          gSearchRange[WORK] = nsPreferences.getBoolPref(prefName, true);
          break;
        case "search_other":
          gSearchRange[OTHER] = nsPreferences.getBoolPref(prefName, true);
          break;
      }
    }
  }
};


function setContext()
{
  //var writeItem = document.getElementById("writeItem");
  //var writeMenu = document.getElementById("writeMenu");

  var selectedCards = GetSelectedAbCards();
  var hasAddEmail = cardsHasSecondEmail(selectedCards);

  setWriteSubMenus("writeItem", "writeMenu", "primaryEmailItem", "additionalEmailItem",
    hasAddEmail, selectedCards);

  if ( nsPreferences.getBoolPref("show_cc_item", true) ) {
    setWriteSubMenus("writeCcItem", "writeCcMenu", "primaryEmailCcItem", "additionalEmailCcItem",
      hasAddEmail, selectedCards);
  }

  if ( nsPreferences.getBoolPref("show_bcc_item", true) ) {
    setWriteSubMenus("writeBccItem", "writeBccMenu", "primaryEmailBccItem", "additionalEmailBccItem",
      hasAddEmail, selectedCards);
  }

  // Disable the "properties" item if multiple contacts are selected
  if (selectedCards.length === 1) {
    document.getElementById("propertiesItem").removeAttribute("disabled");
  } else {
    document.getElementById("propertiesItem").setAttribute("disabled", true);
  }
}


function cardsHasSecondEmail(cards) 
{
  var result = false;

  for (var i=0; i<cards.length; i++)
  {
    result = cards[i].getProperty("SecondEmail", "") !== "";
    if (result)
    {
      break;
    }
  }
  
  return result;
}


function setWriteSubMenus(item, menu, primary, additional, hasAddEmail, cards) 
{
  if (hasAddEmail)
  {
    document.getElementById(item).hidden = true;
    document.getElementById(menu).hidden = false;
    
    if (cards.length === 1)
    {
      var primaryEmail = cards[0].primaryEmail;
      if ( primaryEmail !== "" )
        document.getElementById(primary).setAttribute("label", primaryEmail);

      var secondEmail = cards[0].getProperty("SecondEmail", "");
      if ( secondEmail !== "" )
        document.getElementById(additional).setAttribute("label", secondEmail);
    }
    else
    {
      document.getElementById(primary).setAttribute("label", gContactsPanelBundle.GetStringFromName("contactsSidebar.email"));
      document.getElementById(additional).setAttribute("label", gContactsPanelBundle.GetStringFromName("contactsSidebar.additionalEmail"));
    }
  }
  else
  {
    document.getElementById(item).hidden = false;
    document.getElementById(menu).hidden = true;
  }
}


function setMenuOptionsVisibility() 
{
  var ccValue  = nsPreferences.getBoolPref("show_cc_item",  true);
  var bccValue = nsPreferences.getBoolPref("show_bcc_item", true);
  
  setMenuOptionVisibility("writeCcItem", "writeCcMenu",  ccValue);
  setMenuOptionVisibility("writeBccItem", "writeBccMenu", bccValue);
}


function setMenuOptionVisibility(menuId, submenuId, prefValue)
{
  var elem = document.getElementById(menuId);
  if (elem) {
    elem.hidden = !prefValue;
  }
  if (submenuId !== "")
    elem = document.getElementById(submenuId);
    if (elem) {
      elem.hidden = !prefValue;
    }

  return prefValue;
}

// Copy from http://mxr.mozilla.org/comm-central/source/mail/components/addrbook/content/abCommon.js#537
function GenerateAddressFromCard(card)
{
  if (!card)
    return "";

  var email;

  if (card.isMailList)
  {
    var directory = GetDirectoryFromURI(card.mailListURI);
    email = directory.description || card.displayName;
  }
  else
  {
  // Modified "email" to use second email.
    if (gUseSecondEmail) {
      email = card.getProperty("SecondEmail", "");
    } else {
      email = card.primaryEmail;
    }
  }

  return MailServices.headerParser.makeMimeAddress(card.displayName, email);
}

var strBundleService = null;

function srGetStrBundle(path)
{
  var strBundle = null;

  if (!strBundleService)
  {
    try {
      strBundleService = Components.classes['@mozilla.org/intl/stringbundle;1'].getService();
      strBundleService = strBundleService.QueryInterface(Components.interfaces.nsIStringBundleService);
    } catch (ex) {
      dump("\n--** strBundleService failed: " + ex + "\n");
      return null;
    }
  }

  strBundle = strBundleService.createBundle(path);
  if (!strBundle)
  {
    dump("\n--** strBundle createInstance failed **--\n");
  }

  return strBundle;
}


function GetSelectedCardTypes()
{
  var cards = GetSelectedAbCards();
  if (!cards)
    return kNothingSelected; // no view

  var count = cards.length;
  if (!count)
    return kNothingSelected;  // nothing selected

  var mailingListCnt = 0;
  var cardCnt = 0;
  for (var i = 0; i < count; i++) {
    if (cards[i].isMailList)
      mailingListCnt++;
    else
      cardCnt++;
  }
  if (mailingListCnt && cardCnt)
    return kListsAndCards;        // lists and cards selected
  else if (mailingListCnt && !cardCnt) {
    if (mailingListCnt > 1)
      return kMultipleListsOnly; // only multiple mailing lists selected
    else
      return kSingleListOnly;    // only single mailing list
  }
  else if (!mailingListCnt && cardCnt) {
    if (cardCnt > 1)
      return kMultipleCardsOnly; // only multiple cards selected
    else
      return kSingleCardOnly;    // only single card list
  }
  return kNothingSelected;  // other things
}


function AbDelete()
{
  var types = GetSelectedCardTypes();
  if (types == kNothingSelected)
    return;

  var promptService = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);

  // Only ask for confirmation if this is wanted
  if (gConfirmDelete !== 2)
  {
    var confirmDeleteMessage = "";
    
    // If at least one mailing list is selected then prompt users for deletion.
    if (types == kListsAndCards)
      confirmDeleteMessage = gContactsPanelBundle.GetStringFromName("contactsSidebar.confirmDeleteListsAndCards");
    else if (types == kMultipleListsOnly)
      confirmDeleteMessage = gContactsPanelBundle.GetStringFromName("contactsSidebar.confirmDeleteMailingLists");
    else if (types == kSingleListOnly)
      confirmDeleteMessage = gContactsPanelBundle.GetStringFromName("contactsSidebar.confirmDeleteMailingList");
      
    // If confirm delete is wanted for all contacts then prompt users for deletion.
    else if (gConfirmDelete === 0 && types == kMultipleCardsOnly)
      confirmDeleteMessage = gContactsPanelBundle.GetStringFromName("contactsSidebar.confirmDeleteCards");
    else if (gConfirmDelete === 0 && types == kSingleCardOnly)
      confirmDeleteMessage = gContactsPanelBundle.GetStringFromName("contactsSidebar.confirmDeleteCard");

    if (confirmDeleteMessage !== "")
      if (!promptService.confirm(window, null, confirmDeleteMessage))
        return;
  }

  gAbView.deleteSelectedCards();
}


function cardToFilename(card, ext) {
  var result = "";
  
  if (card.primaryEmail !== "") {
    result = card.primaryEmail;
  } else if (card.getProperty("SecondEmail", "") !== "") {
    result = card.getProperty("SecondEmail", "");
  } else {
    result = "nsmail";
  }

  var index = result.indexOf("@");
  if (index >= 0) {
    result = result.substr(0, index);
  } else {
    result = result;
  }

  if (ext !== "") {
    result += "." + ext;
  }

  return result;
}


function GetForwardContactInfo()
{
  var cards = GetSelectedAbCards();
  
  if (cards.length === 0)
    return;

  var subject = "";
  var prettyName = "";
  if (cards.length === 1)
  {
    // var array = [cards[0].displayName];
    var array = [cardToFilename(cards[0], "")];
    subject =  gContactsPanelBundle.formatStringFromName("contactsSidebar.forwardContactSubject", array, array.length);
    prettyName = cardToFilename(cards[0], "vcf");
  }
  else
  {
    subject = gContactsPanelBundle.GetStringFromName("contactsSidebar.forwardMultipleContactSubject");
    prettyName = "contacts.vcf";
  }
  
  // Create vCard attachment 
  var vCardUrl = "data:text/x-vcard;charset=utf-8,";
  for (var i=0; i<cards.length; i++)
  {
    //vCardUrl += encodeURIComponent(unescape( cards[i].convertToEscapedVCard() ));
	vCardUrl += cards[i].translateTo("vcard");
  }
  
  // Create a message with vCard(s) as attachment
  var attachment;
  try {
    attachment = Components.classes['@mozilla.org/messengercompose/attachment;1']
                          .createInstance(Components.interfaces.nsIMsgAttachment);
    attachment.url = vCardUrl;
    attachment.name = prettyName;
  } catch (ex) {}
  
  return { subject: subject, attachment: attachment };
}


function csOnKeypress(aEvent)
{
  var isContactsSidebar = aEvent.currentTarget.getAttribute("isContactsSidebar");

  switch( aEvent.keyCode )
  {
    case KeyEvent.DOM_VK_ENTER:
    case KeyEvent.DOM_VK_RETURN:
      if (aEvent.altKey)
      {
        AbEditSelectedCard();
      }
      else {
        // Ctrl+enter uses additional email address
        var useSecondEmail = aEvent.ctrlKey;
      
        if ( isContactsSidebar )
        {
          var format;
          // Shift+enter toggles HTML/text compose
          if (aEvent.shiftKey) {
            format = msgComposeFormat.OppositeOfDefault;
          } else {
            format = msgComposeFormat.Default;
          }
          contactsComposeMessage(msgComposeType.New, format, 'addr_to', useSecondEmail);
        }
        else if ( !aEvent.shiftKey )
        {
          csAddSelectedAddresses('addr_to', useSecondEmail);
          
          // Dont send the message when Ctrl-Enter is pressed in the sidebar
          if ( aEvent.ctrlKey  )
            aEvent.preventDefault();
        }
      }
      break;
    case KeyEvent.DOM_VK_DELETE:
      AbDelete();
      aEvent.preventDefault();
      break;
    case KeyEvent.DOM_VK_INSERT:
      AbNewCard('dirTree');
      break;
    case KeyEvent.DOM_VK_A:
      if ( aEvent.ctrlKey )
      {
        //alert("Select all");
        // Select all contacts in the sidebar
        gContactsTree.view.selection.selectAll();
      }
      break;
     default:
/*
       var S = "";
       for (var i in aEvent)
         S += i + ": " + aEvent[i] + "\n";
       alert(S);
*/
  }
}

function csOnClick(aEvent)
{
  // we only care about button 0 (left click) and 
  // button 1 (middle click) events
  if (aEvent.button === 0) 
  {
    // all we need to worry about here is column header clicks.
    var t = aEvent.originalTarget;

    if (t.localName == "treecol") {
      var sortDirection;
      var currentDirection = t.getAttribute("sortDirection");

      if (currentDirection == kDefaultDescending)
        sortDirection = kDefaultAscending;
      else
        sortDirection = kDefaultDescending;

      SortAndUpdateIndicators(t.id, sortDirection);
    }
  }
  else if (aEvent.button === 1) 
  {
    processClickEvent(aEvent);
  }
}


function csOnDoubleClick(aEvent)
{
  // we only care about button 0 (left click) events
  if (aEvent.button === 0)
    processClickEvent(aEvent);
}

function processClickEvent(aEvent)
{
  var isContactsSidebar = aEvent.currentTarget.getAttribute("isContactsSidebar");

  // Only select valid row if middle button is clicked
  if ( !isValidRow(aEvent, aEvent.button === 1) )
  {
    // clicking on a non valid row should not open the compose window
    return;
  }

  // Alt double click: view properties
  if (aEvent.altKey)
  {
    AbEditSelectedCard();
    return;
  }

  // Control double click selects second email address as to: address
  var useSecondEmail = aEvent.ctrlKey;

  if ( isContactsSidebar )
  {
    var format;
    // Shift double click toggles HTML/text compose
    if (aEvent.shiftKey) {
      format = msgComposeFormat.OppositeOfDefault;
    } else {
      format = msgComposeFormat.Default;
    }
    // ok, go ahead and write a new message
    contactsComposeMessage(msgComposeType.New, format, 'addr_to', useSecondEmail);
  }
  else if ( !aEvent.shiftKey ) 
      csAddSelectedAddresses('addr_to', useSecondEmail);
}


function isValidRow(aEvent, doSelect)
{
  var row = gContactsTree.treeBoxObject.getRowAt(aEvent.clientX, aEvent.clientY);
  
  var result = (row !== -1 &&
                row <= gContactsTree.view.rowCount-1 &&
                aEvent.originalTarget.localName == "treechildren");
  
  if (result && doSelect)
  {
    gContactsTree.focus();
    gContactsTree.view.selection.select(row);
  }
    
  return result;
}
