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

const NAME     = 0;
const INTERNET = 1;
const PHONES   = 2;
const HOME     = 3;
const WORK     = 4;
const OTHER    = 5;

// See ./mailnews/addrbook/public/nsIAddrDatabase.idl for all field names
const abName = new Array("FirstName", "LastName", "DisplayName", "NickName");
const abInternet = new Array("PrimaryEmail", "SecondEmail", "PreferMailFormat", "_AimScreenName");
const abPhones = new Array("WorkPhone", "HomePhone", "FaxNumber", "PagerNumber", "CellularNumber");
const abHome = new Array("HomeAddress", "HomeAddress2", "HomeCity", "HomeState", "HomeZipCode", "HomeCountry", "WebPage2");
const abWork = new Array("JobTitle", "Department", "Company", "WorkAddress", "WorkAddress2", "WorkCity", "WorkState", "WorkZipCode", "WorkCountry", "WebPage1");
const abOther = new Array("Custom1", "Custom2", "Custom3", "Custom4", "Notes");
const abFields = new Array(abName, abInternet, abPhones, abHome, abWork, abOther);

const searchModes = new Array("c", "bw", "ew", "=");

var  gSearchTimer = setTimeout("", 0);

function buildSearchQuery(searchString, searchMode)
{
  /* Token   Condition
   *  =       Is
   *  !=      Is Not
   *  lt      Less Than
   *  gt      Greater Than
   *  bw      Begins With
   *  ew      Ends With
   *  c       Contains
   *  !c      Does Not Contain
   *
   * see nsAbQueryStringToExpression::CreateBooleanConditionString in
   * ./mailnews/addrbook/src/nsAbQueryStringToExpression.cpp
   */
  var result = "";
  var searchTerms = searchString.split(" ");
  
  var count = 0;
  for (var i=0; i<searchTerms.length; i++)
  {
    if (searchTerms[i] != "")
    {
      count++;
      var condition = searchModes[searchMode];
      // When using wildcard search (*), always use the condition "="
      if ( searchTerms[i] == "*" )
		condition = searchModes[3];
      result += getSubQuery(condition, encodeURIComponent(searchTerms[i]));
    }
  }

  if (count > 1)
    result = "?(and" + result + ")";
  else
    result = "?" + result;

  return result;
}

/*
 * query format: "(or(DisplayName,@C,@V)(FirstName,@C,@V)(LastName,@C,@V))"
 */
function getSubQuery(condition, value)
{
  var result = "(or";

  for (var i=0; i<abFields.length; i++)
  {
    if (gSearchRange[i])
      for (var j=0; j<abFields[i].length; j++)
      {
        result += "(" + abFields[i][j] + "," + condition + "," + value + ")";
      }
  }

  result += ")";
  
  return result;
}


function DirPaneSelectionChangeMenulist()
{
  if (abList && abList.selectedItem) 
  {
    if (gSearchInput.value && (gSearchInput.value != ""))
      onEnterInSearchBar();
    else
      ChangeDirectoryByURI(abList.selectedItem.id);

    if ( isLdapDirectory(abList.selectedItem.id) )
      // Disable delete item for LDAP address books
      document.getElementById("deleteItem").setAttribute("disabled", true);
    else
      // Enable delete item for "normal" address books
      document.getElementById("deleteItem").removeAttribute("disabled");
  }
}


function csOnSearchInputFocus(event)
{
  // search bar has focus, ...clear the showing search criteria flag
  if (gSearchInput.showingSearchCriteria)
  {
    gSearchInput.value = "";
    gSearchInput.showingSearchCriteria = false;
  }

  gSearchInput.select();
}


function csOnSearchInputBlur(event)
{
  // ignore the blur if we are in the middle of processing the clear button
  if (gSearchFocusEl && gSearchFocusEl.id == 'peopleSearchInput')
    return;
               
  if (!gSearchInput.value)
    gSearchInput.showingSearchCriteria = true;

  if (gSearchInput.showingSearchCriteria)
    gSearchInput.setSearchCriteriaText();
}


function csOnSearchInput(returnKeyHit)
{
  if (gSearchInput.showingSearchCriteria)
    return;

  if (gSearchTimer) {
    clearTimeout(gSearchTimer);
    gSearchTimer = null;
  }

  if (returnKeyHit) {
    onEnterInSearchBar();
  }
  else {
    gSearchTimer = setTimeout("onEnterInSearchBar();", 800);
  }
}


// temporary global used to make sure we restore focus to the correct element after 
// clearing the quick search box because clearing quick search means stealing focus.
var gSearchFocusEl = null;

function csOnClearSearch()
{
  // ignore the text box value if it's just showing the search criteria string
  if (!gSearchInput.showingSearchCriteria || gSearchInput.searchMode == 4) 
  {
    // save of the last focused element so that focus can be restored
    //gSearchFocusEl = gLastFocusedElement;

    // restore last search mode when current mode is Adv search
    SetSearchMode( gOldSearchMode );

    gSearchInput.value = "";
    onEnterInSearchBar();

    // this needs to be on a timer otherwise we end up messing up the focus while 
    // the Search("") is still happening
    setTimeout("restoreSearchFocusAfterClear();", 0);
  }
}


function restoreSearchFocusAfterClear()
{
//  gSearchFocusEl.focus();
  gSearchInput.clearButtonHidden = 'true';
  gSearchFocusEl = null;
}


function csOnSearchKeyPress(event)
{
  if (gSearchInput.showingSearchCriteria)
    gSearchInput.showingSearchCriteria = false;

  if (event && event.keyCode == KeyEvent.DOM_VK_RETURN)
    csOnSearchInput(true);
  // added this else clause, because the oninput event is never called. It looks
  // this is because in the XUL file the parent vbox is initial collapsed. 
  else
    csOnSearchInput(false);
}


function isValidSearchQuery()
{
  return ( !(gSearchInput.value == "" || gSearchInput.showingSearchCriteria) );
}


function onEnterInSearchBar()
{
  var searchURI = GetSelectedDirectory();
  if (!searchURI) return;
  
  var sortColumn    = gAbView ? gAbView.sortColumn    : kDefaultSortColumn;
  var sortDirection = gAbView ? gAbView.sortDirection : kDefaultAscending;
  var searchTerm = gSearchInput.value;

  // When switching TO an LDAP directory, use a default 
  // search term so no empty list appears
  if ( gUseDefaultSearch && isLdapDirectory(searchURI) && !isValidSearchQuery() )
    searchTerm = gDefaultSearch;

  if (isValidSearchQuery() || searchTerm == gDefaultSearch)
    searchURI += buildSearchQuery(searchTerm, gSearchInput.searchMode);

// Tb3 porting
//  SetAbView(searchURI, searchTerm != "", sortColumn, sortDirection);
  SetAbView(searchURI);
	
  if (!isValidSearchQuery(gSearchInput.value))
    gSearchInput.showingSearchCriteria = true;
  else
    gSearchInput.clearButtonHidden = 'false';
  
  SelectFirstCard();
}


function isLdapDirectory(uri)
{
  var ldapUrlPrefix = "moz-abldapdirectory://";
  var result = ((uri.indexOf(ldapUrlPrefix, 0)) == 0)
  
  return result;
}

function ChangeDirectoryByURI(uri)
{
  if (!uri)
    uri = kPersonalAddressbookURI;

//  if (gAbView && gAbView.URI == uri)
//    return;
  var actualSortColumn = SetAbView(uri);

  var dataNode = document.getElementById(uri);
  var sortColumn = dataNode ? dataNode.getAttribute("sortColumn") : kDefaultSortColumn;
  var sortDirection = dataNode ? dataNode.getAttribute("sortDirection") : kDefaultAscending;

  //Switching to LDAP -> use default search term
  if ( dataNode && isLdapDirectory(dataNode.value) )
  {
    onEnterInSearchBar();
    return;
  }

// Tb3 porting
//  var actualSortColumn = SetAbView(uri, sortColumn, sortDirection);
/*
  var actualSortColumn = SetAbView(uri);
*/
  UpdateSortIndicators(actualSortColumn, sortDirection);

  // only select the first card if there is a first card
  if (gAbView && gAbView.getCardFromRow(0)) {
    SelectFirstCard();
  }
  else {
    // the selection changes if we were switching directories.
    ResultsPaneSelectionChanged()
  }
  return;
}

function SetSearchMode( mode )
{
  gSearchInput.searchMode = mode;

  var menuPopup = document.getElementById('cs-search-menupopup');
  if (menuPopup)
  {
    var menuItems = menuPopup.getElementsByAttribute('value', gSearchInput.searchMode);
    menuItems[0].setAttribute('checked', "true")
  }
}

function csChangeSearchMode(aMenuItem)
{
  // extract the label and set the search input to match it
  var doInitSearch = gSearchInput.searchMode == 4;
  if ( gSearchInput.searchMode != 4 )
    gOldSearchMode = gSearchInput.searchMode;
  gSearchInput.searchMode = aMenuItem.value;

  var inPowerSearch = false;
  if ( gSearchInput.searchMode == 4 )
  {
    // Special searchmode case, launch Adv search
    inPowerSearch = csPowerSearch( doInitSearch );

    if ( !inPowerSearch )
      SetSearchMode( gOldSearchMode );
    else
      gSearchInput.value = "";
  }

  if ( !isValidSearchQuery() )
  {
    gSearchInput.showingSearchCriteria = true;
    if (gSearchInput.value)
      gSearchInput.setSearchCriteriaText();
  }

  if (!gSearchInput.value)
    // if the search box is empty, set showing search criteria to true so it 
    // shows up when focus moves out of the box
    gSearchInput.showingSearchCriteria = true;
  else if (gSearchInput.showingSearchCriteria)
    // if we are showing criteria text and the box isn't empty, change the criteria text  
    gSearchInput.setSearchCriteriaText();
  else if (gOldSearchMode != gSearchInput.searchMode && !inPowerSearch )
    // the search mode just changed so we need to redo the quick search
    onEnterInSearchBar();
}

function csPowerSearch(doInitSearch)
{
  var result = false;

  var selectedDirectoy = GetSelectedDirectory();
  var curCaller = "ContactsSidebar";
  var curSearchURI = ( doInitSearch ? gAbView.URI : null );
  var args = { directory: selectedDirectoy, caller: curCaller, searchURI: curSearchURI };

  var chromeURL = "chrome://messenger/content/ABSearchDialog.xul";
  window.openDialog(chromeURL, "", "chrome,resizable,modal,centerscreen,dialog=no", args);

  if  ( args.searchURI && args.searchURI != "" )
  {
    // Perform the advanced search
    var sortColumn    = gAbView ? gAbView.sortColumn    : kDefaultSortColumn;
    var sortDirection = gAbView ? gAbView.sortDirection : kDefaultAscending;

// Tb3 porting
//    SetAbView(args.searchURI, true, sortColumn, sortDirection);
	SetAbView(args.searchURI);
    result = true;
  }

  return result;
}