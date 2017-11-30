/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Contacts Sidebar.
 *
 * The Initial Developer of the Original Code is Jeroen Peters.
 * Portions created by the Initial Developer are Copyright (C) 2004
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Jeroen Peters <jpeters@coldmail.nl>
 *  Masahiko Imanaka <chimantaea_mirabilis@yahoo.co.jp>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var bundleSettings;
var gRdfService;
var gBaseResource;
var gLocalstoreDS;

function csAbPanelLoad()
{
  initCommon();
  
  gRdfService = Components.classes['@mozilla.org/rdf/rdf-service;1']
                           .getService(Components.interfaces.nsIRDFService);
  gLocalstoreDS = gRdfService.GetDataSource("rdf:local-store");
  gBaseResource = "chrome://messenger/content/addressbook/abContactsPanel.xul#";
  
  AddTreeContextMenu();
  AddTreeCols();
  AddSearchInputMenu();
  
  csAddPrefObservers();
  setMenuOptionsVisibility();
  
  var resultsTree = document.getElementById("abResultsTree");
  resultsTree.setAttribute("onkeypress", "csOnKeypress(event);");
  resultsTree.setAttribute("onclick", "csOnClick(event);");
  resultsTree.setAttribute("ondblclick", "csOnDoubleClick(event);");
  
  document.getElementById("cardProperties").addEventListener("popupshowing", setContext, false);

  var searchInput = document.getElementById("peopleSearchInput");
  searchInput.setAttribute("onfocus", "csOnSearchInputFocus();");
  searchInput.setAttribute("onblur", "csOnSearchInputBlur(event);");
  searchInput.setAttribute("onclick", "this.select();");
  searchInput.setAttribute("oninput", "csOnSearchInput(false);");
  searchInput.setAttribute("onkeypress", "csOnSearchKeyPress(event);");
  InitMenuPopupValue();
  searchInput.init();
  
  SetUnload();
}

function csAbPanelUnload() {
  csRemovePrefObservers();
  document.getElementById("cardProperties")
          .removeEventListener("popupshowing", setContext, false);
  AbPanelUnload();
}

function SetUnload()
{
  var elem = document.getElementById("abContactsPanel");
  if (elem)
    elem.setAttribute("onunload", "csAbPanelUnload();");
}

function AddTreeContextMenu()
{
  var popup = document.getElementById("cardProperties");
  if (popup)
  {
    // Remove original popup menu items
    while ( popup.firstChild )
      popup.removeChild( popup.firstChild );

    // Add the new popup items
    bundleSettings = srGetStrBundle("chrome://contactssidebar/locale/csAbContactsPanel.properties");
    
    // Properties
    AddMenuItem(popup, "propertiesItem",
                "contactsSidebar.cardProperties.label",
                "contactsSidebar.cardProperties.accesskey",
                "AbEditSelectedCard();");
    AddMenuSeparator(popup);
    
    // Write item and sub menu
    AddMenuItem(popup, "writeItem",
                "contactsSidebar.newmsgButton.label",
                "contactsSidebar.newmsgButton.accesskey",
                "csAddSelectedAddresses('addr_to', false);");
    var menu = AddMenu(popup, "writeMenu",
                       "contactsSidebar.newmsgButton.label",
                       "contactsSidebar.newmsgButton.accesskey");
    var subPopup = AddMenuPopup(menu);
    AddMenuItem(subPopup, "primaryEmailItem", "", "", "csAddSelectedAddresses('addr_to', false);");
    AddMenuItem(subPopup, "additionalEmailItem", "", "", "csAddSelectedAddresses('addr_to', true);");
    
    // Write CC item and sub menu
    AddMenuItem(popup, "writeCcItem",
                "contactsSidebar.newmsgCCButton.label",
                "contactsSidebar.newmsgCCButton.accesskey",
                "csAddSelectedAddresses('addr_cc', false);");
    var menu = AddMenu(popup, "writeCcMenu",
                       "contactsSidebar.newmsgCCButton.label",
                       "contactsSidebar.newmsgCCButton.accesskey");
    var subPopup = AddMenuPopup(menu);
    AddMenuItem(subPopup, "primaryEmailCcItem", "", "", "csAddSelectedAddresses('addr_cc', false);");
    AddMenuItem(subPopup, "additionalEmailCcItem", "", "", "csAddSelectedAddresses('addr_cc', true);");
    
    // Write BCC item and sub menu
    AddMenuItem(popup, "writeBccItem",
                "contactsSidebar.newmsgBCCButton.label",
                "contactsSidebar.newmsgBCCButton.accesskey",
                "csAddSelectedAddresses('addr_bcc', false);");
    var menu = AddMenu(popup, "writeBccMenu",
                       "contactsSidebar.newmsgBCCButton.label",
                       "contactsSidebar.newmsgBCCButton.accesskey");
    var subPopup = AddMenuPopup(menu);
    AddMenuItem(subPopup, "primaryEmailBccItem", "", "", "csAddSelectedAddresses('addr_bcc', false);");
    AddMenuItem(subPopup, "additionalEmailBccItem", "", "", "csAddSelectedAddresses('addr_bcc', true);");
    
/*
    // Forward contact
    AddMenuItem(popup, "forwardContact",
                "contactsSidebar.forwardContact.label",
                "contactsSidebar.forwardContact.accesskey",
                "csAbAddContactAttachment();");
*/
    AddMenuSeparator(popup, "writeSeparator");
    
    // New card
    AddMenuItem(popup, "newCard",
                "contactsSidebar.newcardButton.label",
                "contactsSidebar.newcardButton.accesskey",
                "AbNewCard('dirTree')");
    AddMenuSeparator(popup);
    
    // Delete card
    AddMenuItem(popup, "deleteItem",
                "contactsSidebar.deleteCard.label",
                "contactsSidebar.deleteCard.accesskey",
                "AbDelete();");
  }
}

function AddSearchInputMenu()
{
//   var popup = document.getElementById("quick-search-menupopup");

  var searchBox = document.getElementById("peopleSearchInput");
  var searchButton = AddMenuXUL("button", searchBox, "search-button");
  searchButton.setAttribute("type", "menu");

  var popup = AddMenuPopup(searchButton);
  popup.setAttribute("value", "0");
  popup.setAttribute("persist", "value");
  popup.setAttribute("popupalign", "topleft");
  popup.setAttribute("popupanchor", "bottomleft");

//   var popup = document.getElementById("cs-search-menupopup");
  if (popup)
  {
    // Remove original popup menu items
//    while ( popup.firstChild )
//      popup.removeChild( popup.firstChild );
      
    // Add new search criteria menu items
    AddSearchMenuItem(popup, "0",
                "contactsSidebar.searchContains.label",
                "contactsSidebar.searchContains.accesskey",
                "csChangeSearchMode(this);");
    AddSearchMenuItem(popup, "1",
                "contactsSidebar.searchBeginsWidth.label",
                "contactsSidebar.searchBeginsWidth.accesskey",
                "csChangeSearchMode(this);");
    AddSearchMenuItem(popup, "2",
                "contactsSidebar.searchEndsWidth.label",
                "contactsSidebar.searchEndsWidth.accesskey",
                "csChangeSearchMode(this);");
    AddSearchMenuItem(popup, "3",
                "contactsSidebar.searchIs.label",
                "contactsSidebar.searchIs.accesskey",
                "csChangeSearchMode(this);");
    // Change the IDs to Contacts Sidebar IDs
    popup.setAttribute("id", "cs-search-menupopup");
//    var button = document.getElementById("quick-search-button");
//    button.setAttribute("id", "search-button");
  }
}

function AddTreeCols()
{
  var abResultsTree = document.getElementById("abResultsTree");
  var treeCols = abResultsTree.getElementsByTagName("treecols");
  
  if ( !treeCols || treeCols.length < 1 )
    return;

  AddTreeCol( treeCols[0], "_AimScreenName", "ScreenName.label" );
  AddTreeCol( treeCols[0], "Company", "Company.label" );
  AddTreeCol( treeCols[0], "NickName", "NickName.label" );
  AddTreeCol( treeCols[0], "SecondEmail", "SecondEmail.label" );
  AddTreeCol( treeCols[0], "Department", "Department.label" );
  AddTreeCol( treeCols[0], "JobTitle", "JobTitle.label" );
  AddTreeCol( treeCols[0], "CellularNumber", "CellularNumber.label" );
  AddTreeCol( treeCols[0], "PagerNumber", "PagerNumber.label" );
  AddTreeCol( treeCols[0], "FaxNumber", "FaxNumber.label" );
  AddTreeCol( treeCols[0], "HomePhone", "HomePhone.label" );
  AddTreeCol( treeCols[0], "WorkPhone", "WorkPhone.label" );
}

function AddMenuXUL(elementName, parentNode, id, label, accessKey, command, hidden)
{
  var itemNode = document.createElement( elementName );
  
  if ( id && id != "" )
    itemNode.setAttribute("id", id);
  if ( label && label != "")
    itemNode.setAttribute("label", bundleSettings.GetStringFromName(label) );
  if ( accessKey && accessKey != "")
    itemNode.setAttribute("accesskey", bundleSettings.GetStringFromName(accessKey) );
  if ( command && command != "")
    itemNode.setAttribute("oncommand", command);
  if (hidden)
    itemNode.setAttribute("hidden", "true");

  parentNode.appendChild(itemNode);
  
  return itemNode;
}

function AddMenu(parentNode, id, label, accessKey)
{
  return AddMenuXUL( "menu", parentNode, id, label, accessKey, "", true );
}

function AddMenuPopup(parentNode)
{
  return AddMenuXUL( "menupopup", parentNode);
}

function AddMenuItem(parentNode, id, label, accessKey, command)
{
  return AddMenuXUL( "menuitem", parentNode, id, label, accessKey, command );
}

function AddMenuSeparator(parentNode, id)
{
  AddMenuXUL( "menuseparator", parentNode, id);
}

function AddSearchMenuItem(parentNode, value, label, accessKey, command)
{
  var menuItem = AddMenuItem( parentNode, "", label, accessKey, command );
  menuItem.setAttribute( "type", "radio" );
  menuItem.setAttribute( "value", value );
  if ( value == "0")
    menuItem.setAttribute( "checked", "true");
}

function AddTreeColsXUL( parentNode )
{
  var itemNode = document.createElement( "treecols" );
  parentNode.appendChild( itemNode );
  
  return itemNode;
}

function AddSplitter( parentNode )
{
  var itemNode = document.createElement( "splitter" );
  itemNode.setAttribute("class", "tree-splitter" );
  parentNode.appendChild( itemNode );
}

function AddTreeCol( parentNode, id, label)
{
  AddSplitter( parentNode );
  
  var itemNode = document.createElement( "treecol" );
  itemNode.setAttribute("id", id );
  itemNode.setAttribute("label", bundleSettings.GetStringFromName(label) );
  itemNode.setAttribute("class", "sortDirectionIndicator" );
  itemNode.setAttribute("flex", "1" );
  var hidden = GetLocalstoreValue( id, "hidden", true );
  itemNode.setAttribute("hidden", hidden );
  itemNode.setAttribute("persist", "hidden ordinal width sortDirection" );
  
  parentNode.appendChild( itemNode );
}

function InitMenuPopupValue()
{
  var value = GetLocalstoreValue( "cs-search-menupopup", "value", 0 );
  document.getElementById("cs-search-menupopup").setAttribute("value", value);
}

function GetLocalstoreValue( resource, key, defaultValue )
{
  var result = defaultValue;
  
  var sourceResource = gRdfService.GetResource( gBaseResource + resource );
   var property = gRdfService.GetResource( key );
  var target = gLocalstoreDS.GetTarget( sourceResource, property, true );
  
  if ( target )
    result = target.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
    
  return result;
}

function csAddSelectedAddresses(recipientType, useSecondEmail)
{
  gUseSecondEmail = useSecondEmail;
  addSelectedAddresses(recipientType);
}

function csAbAddContactAttachment()
{
  var forwardInfo = GetForwardContactInfo();
  
  // Add "forward contact(s)" subject
  var subjectInputElem = parent.document.getElementById("msgSubject");
  if ( subjectInputElem.value == "" )
    subjectInputElem.value = forwardInfo.subject;

  // Add contact(s) vcf file as attachment
  parent.addAttachment( forwardInfo.attachment );
  parent.document.getElementById("attachments-box").hidden = false;
  parent.document.getElementById("attachmentbucket-sizer").hidden = false;

  gContentChanged = true;
}
