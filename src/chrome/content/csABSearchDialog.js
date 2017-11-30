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
 * Portions created by the Initial Developer are Copyright (C) 2007
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

var gSidebarSearch = false;

function csSearchOnLoad()
{
  gSidebarSearch = false;

  // Copied from ./mailnews/base/search/resources/content/ABSearchDialog.js searchOnLoad();
  // -- begin
  //UpgradeAddressBookResultsPaneUI("mailnews.ui.advanced_directory_search_results.version");

  initializeSearchWidgets();
  initializeSearchWindowWidgets();

  gSearchBundle = document.getElementById("bundle_search");
  gSearchStopButton.setAttribute("label", gSearchBundle.getString("labelForSearchButton"));
  gSearchStopButton.setAttribute("accesskey", gSearchBundle.getString("labelForSearchButton.accesskey"));
  gAddressBookBundle = document.getElementById("bundle_addressBook");
  gSearchSession = Components.classes[searchSessionContractID].createInstance(Components.interfaces.nsIMsgSearchSession);

  // initialize a flag for phonetic name search
  var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Components.interfaces.nsIPrefService);
  var prefBranch = prefService.getBranch(null).QueryInterface(Components.interfaces.nsIPrefBranch2);
  gSearchPhoneticName =
        prefBranch.getComplexValue("mail.addr_book.show_phonetic_fields",
                                   Components.interfaces.nsIPrefLocalizedString).data;

  if (window.arguments && window.arguments[0])
    SelectDirectory(window.arguments[0].directory);
  else
    SelectDirectory(document.getElementById("abPopup-menupopup")
                            .firstChild.value);

  // initialize globals, see abCommon.js, InitCommonJS()
  abList = document.getElementById("abPopup");
  gAbResultsTree = document.getElementById("abResultsTree");
  //onMore(null);
  // -- end

  // Hide elements when the dialog is called from the Contacts Sidebar
  if ( window.arguments && window.arguments[0] && window.arguments[0].caller == "ContactsSidebar" )
  {
    gSidebarSearch = true;

    if ( window.arguments[0].searchURI )
    {
      // Initialize search rows
      InitSearch( window.arguments[0].searchURI );

      // Clear searchURI so the argument ca be used to pass the 
      // return value of this search
      window.arguments[0].searchURI = null;
    }
    else
      onMore(null);

    // Load the dynamic overlay
    document.loadOverlay( " chrome://contactssidebar/content/csABSearchDialogDynamicOverlay.xul", null );

    // Set the address book label
    csSetDirectory();

    // Hide obsolete elements
    HideElement( "abPopup" );
    HideElement( "gray_horizontal_splitter" );
    HideElement( "searchResultListBox" );
  }
}

function csSetDirectory()
{
  var abPopup = document.getElementById( "abPopup" );
  if ( abPopup )
  {
    // Search for the address book label
    var nodeList = document.getElementsByTagName("label");
    if ( nodeList )
    {
      for ( var i=0; i < nodeList.length; i++ )
      {
        if ( nodeList[i].control == "abPopup" )
        {
          nodeList[i].accessKey = "";
          nodeList[i].value += " " + abPopup.label;
        }
      }
    }
  }
}

function onCSSearchButton( event )
{
  if ( gSidebarSearch )
  {
    var searchURI = CreateSearchURI();
    window.arguments[0].searchURI = searchURI;

    // All done
    window.close();
  }
  else
    onSearchButton( event );
}


function CreateSearchURI()
{
  gStatusText.setAttribute("label", "");
  gPropertiesButton.setAttribute("disabled","true");
  gComposeButton.setAttribute("disabled","true") 

  gSearchSession.clearScopes() 

  var currentAbURI = document.getElementById('abPopup').getAttribute('value');

  gSearchSession.addDirectoryScopeTerm(GetScopeForDirectoryURI(currentAbURI));
  saveSearchTerms(gSearchSession.searchTerms, gSearchSession);

  var searchUri = currentAbURI + "?(";

  var count = gSearchSession.searchTerms.Count();
  var resultCount = 0;
  for (var i=0; i<count; i++)
  {
    var searchTerm = gSearchSession.searchTerms.GetElementAt(i).QueryInterface(nsIMsgSearchTerm);
    
    // No need to build a seatrch string when the value isempty
    if ( searchTerm.value.str == "" )
      continue;
    else
      resultCount++;

    // get the "and" / "or" value from the first term
    if (i == 0)
    {
      if (searchTerm.booleanAnd)
        searchUri += "and" 
      else
        searchUri += "or";
    }

    var attrs;

    switch (searchTerm.attrib)
    {
      case nsMsgSearchAttrib.Name:
        if (gSearchPhoneticName == "false")
          attrs = ["DisplayName","FirstName","LastName","NickName","_AimScreenName"];
        else
          attrs = ["DisplayName","FirstName","LastName","NickName","_AimScreenName","PhoneticFirstName","PhoneticLastName"];
        break;
      case nsMsgSearchAttrib.DisplayName:
        attrs = ["DisplayName"];
        break;
      case nsMsgSearchAttrib.Email:
        attrs = ["PrimaryEmail"];
        break;
      case nsMsgSearchAttrib.PhoneNumber:
        attrs = ["HomePhone","WorkPhone","FaxNumber","PagerNumber","CellularNumber"];
        break;
      case nsMsgSearchAttrib.Organization:
        attrs = ["Company"];
        break;
      case nsMsgSearchAttrib.Department:
        attrs = ["Department"];
        break;
      case nsMsgSearchAttrib.City:
        attrs = ["WorkCity"];
        break;
      case nsMsgSearchAttrib.Street:
        attrs = ["WorkAddress"];
        break;
      case nsMsgSearchAttrib.Nickname:
        attrs = ["NickName"];
        break;
      case nsMsgSearchAttrib.WorkPhone:
        attrs = ["WorkPhone"];
        break;
      case nsMsgSearchAttrib.HomePhone:
        attrs = ["HomePhone"];
        break;
      case nsMsgSearchAttrib.Fax:
        attrs = ["FaxNumber"];
        break;
      case nsMsgSearchAttrib.Pager:
        attrs = ["PagerNumber"];
        break;
      case nsMsgSearchAttrib.Mobile:
        attrs = ["CellularNumber"];
        break;
      case nsMsgSearchAttrib.Title:
        attrs = ["JobTitle"];
        break;
      case nsMsgSearchAttrib.AdditionalEmail:
        attrs = ["SecondEmail"];
        break;
      case nsMsgSearchAttrib.ScreenName:
        attrs = ["_AimScreenName"];
        break;
      default:
        dump("XXX " + searchTerm.attrib + " not a supported search attr!\n");
        attrs = ["DisplayName"];
        break;
    }

    var opStr;

    switch (searchTerm.op) {
    case nsMsgSearchOp.Contains:
      opStr = "c";
      break;
    case nsMsgSearchOp.DoesntContain:
      opStr = "!c";
      break;
    case nsMsgSearchOp.Is:
      opStr = "=";
      break;
    case nsMsgSearchOp.Isnt:
      opStr = "!=" 
      break;
    case nsMsgSearchOp.BeginsWith:
      opStr = "bw" 
      break;
    case nsMsgSearchOp.EndsWith:
      opStr = "ew" 
      break;
    case nsMsgSearchOp.SoundsLike:
      opStr = "~=" 
      break;
    default:
      opStr = "c";
      break 
    }

    // currently, we can't do "and" and "or" searches at the same time
    // (it's either all "and"s or all "or"s 
    var max_attrs = attrs.length;

    for (var j=0;j<max_attrs;j++)
    {
      // append the term(s) to the searchUri
      searchUri += "(" + attrs[j] + "," + opStr + "," + encodeURIComponent(searchTerm.value.str) + ")";
    }
  }

  if ( resultCount > 0 )
    searchUri += ")";
  else
    searchUri = "";


  return searchUri;
}

function HideElement( elemId )
{
  var elem = document.getElementById( elemId );
  if ( elem )
    elem.setAttribute( "hidden", "true" );
}

function InitSearch( URI )
{
  var components = URI.split("?(");
  if ( components.length == 2 )
  {
    // Extract boolean operator and search terms
    var re = new RegExp( "([^\(]*)(.*)" );
    var m = re.exec( components[1] );
    if ( m )
    {
      var operator = m[1];
      //gSearchBooleanRadiogroup.value = operator;

      // Skip first and last two parentheses
      var fields = m[2].substring( 1, m[2].length-2 );
      var terms = fields.split(")(");

      var termObjects = new Array( terms.length );
      for ( var i=0; i<terms.length; i++)
      {
        var termStr = terms[i].split(",");
        var termObj = { attrib: termStr[0], op: termStr[1], value: termStr[2] };
        termObjects[i] = termObj;
      }

      for ( var i=0; i<termObjects.length; i++)
      {
        var term = gSearchSession.createTerm();

        term.matchAll = false;
        if( i == 0 )
          term.booleanAnd = ( operator == "and" );
        else
          term.booleanAnd = false

        value = term.value;
        value.str = termObjects[i].value;;
        term.value = value;

        if ( gSearchPhoneticName == "false" && FieldMatch( ["DisplayName","FirstName","LastName","NickName","_AimScreenName"], termObjects, i ) )
        {
          term.attrib = nsMsgSearchAttrib.Name;
          i = i + 4;
        }
        else if ( gSearchPhoneticName == "true" && FieldMatch( ["DisplayName","FirstName","LastName","NickName","_AimScreenName","PhoneticFirstName","PhoneticLastName"], termObjects, i ) )
        {
          term.attrib = nsMsgSearchAttrib.Name;
          i = i + 6;
        }
        else if ( FieldMatch( ["DisplayName"], termObjects, i ) )
          term.attrib = nsMsgSearchAttrib.DisplayName;
        else if ( FieldMatch( ["PrimaryEmail"], termObjects, i ) )
          term.attrib = nsMsgSearchAttrib.Email;
        else if ( FieldMatch( ["HomePhone","WorkPhone","FaxNumber","PagerNumber","CellularNumber"], termObjects, i ) )
        {
          term.attrib = nsMsgSearchAttrib.PhoneNumber;
          i = i + 4;
        }
        else if ( FieldMatch( ["Company"], termObjects, i ) )
          term.attrib = nsMsgSearchAttrib.Organization;
        else if ( FieldMatch( ["Department"], termObjects, i ) )
          term.attrib = nsMsgSearchAttrib.Department;
        else if ( FieldMatch( ["WorkCity"], termObjects, i ) )
          term.attrib = nsMsgSearchAttrib.City;
        else if ( FieldMatch( ["WorkAddress"], termObjects, i ) )
          term.attrib = nsMsgSearchAttrib.Street;
        else if ( FieldMatch( ["NickName"], termObjects, i ) )
          term.attrib = nsMsgSearchAttrib.NickName;
        else if ( FieldMatch( ["WorkPhone"], termObjects, i ) )
          term.attrib = nsMsgSearchAttrib.WorkPhone;
        else if ( FieldMatch( ["HomePhone"], termObjects, i ) )
          term.attrib = nsMsgSearchAttrib.HomePhone;
        else if ( FieldMatch( ["FaxNumber"], termObjects, i ) )
          term.attrib = nsMsgSearchAttrib.Fax;
        else if ( FieldMatch( ["PagerNumber"], termObjects, i ) )
          term.attrib = nsMsgSearchAttrib.Pager;
        else if ( FieldMatch( ["CellularNumber"], termObjects, i ) )
          term.attrib = nsMsgSearchAttrib.Mobile;
        else if ( FieldMatch( ["JobTitle"], termObjects, i ) )
          term.attrib = nsMsgSearchAttrib.Title;
        else if ( FieldMatch( ["SecondEmail"], termObjects, i ) )
          term.attrib = nsMsgSearchAttrib.AdditionalEmail;
        else if ( FieldMatch( ["_AimScreenName"], termObjects, i ) )
          term.attrib = nsMsgSearchAttrib.ScreenName;
        else
          term.attrib = nsMsgSearchAttrib.DisplayName;


        if ( termObjects[i].op == "c" )
          term.op = nsMsgSearchOp.Contains;
        else if ( termObjects[i].op == "!c" )
          term.op = nsMsgSearchOp.DoesntContain;
        else if ( termObjects[i].op == "=" )
          term.op = nsMsgSearchOp.Is;
        else if ( termObjects[i].op == "!=" )
          term.op = nsMsgSearchOp.Isnt;
        else if ( termObjects[i].op == "bw" )
          term.op = nsMsgSearchOp.BeginsWith;
        else if ( termObjects[i].op == "ew" )
          term.op = nsMsgSearchOp.EndsWith;
        else if ( termObjects[i].op == "~=" )
          term.op = nsMsgSearchOp.SoundsLike;
        else
          term.op = nsMsgSearchOp.Contains;

        gSearchSession.appendTerm( term );
      }

      initializeSearchRows( gSearchScope, gSearchSession.searchTerms );
    }
  }
}

function FieldMatch( fields, termObjects, index )
{
  var result = true;

  var op = termObjects[index].op;
  var value = termObjects[index].value;

  for (var i=0; i<fields.length; i++)
  {
    // DO not go across the boundaries
    result = index+i < termObjects.length && 
             fields[i] == termObjects[index+i].attrib;

    if ( i != 0  )
       result = result && termObjects[index+i].op == op && termObjects[index+i].value == value;
  }

  return result;
}