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

function initiateContactsSidebar() {
  // Add Contacts Sidebar menu item to the layout menu
  var messagePaneLayout = top.document.getElementById("menu_MessagePaneLayout");
  if (messagePaneLayout)
  {
    var bundleSettings = document.getElementById("bundle_contactsSidebar");
    
    var popupNode = messagePaneLayout.firstChild;
    var itemNode = document.createElement( "menuitem" );
    itemNode.setAttribute("id", "menu_showContacts");
    itemNode.setAttribute("label", bundleSettings.getString("contactsSidebar.showContactsCmd.label"));
    itemNode.setAttribute("key", "key_toggleContactsSidebar");
    itemNode.setAttribute("accesskey", bundleSettings.getString("contactsSidebar.showContactsCmd.accesskey"));
   // itemNode.setAttribute("observes", "viewContactsSidebar");
    itemNode.setAttribute("autocheck", "true");
    itemNode.setAttribute("type", "checkbox");
    itemNode.setAttribute("oncommand", "toggleContactsSidebar();");

    popupNode.appendChild(itemNode);
  }
  
  // See if we need to auto open the contacts sidebar.
  var sideBarBox = document.getElementById('sidebar-box');
  if (sideBarBox.getAttribute("sidebarVisible") == "true") {
    // if we aren't supposed to have the side bar hidden, make sure it is visible
    if (document.getElementById("sidebar").getAttribute("src") == "") {
      setTimeout(toggleContactsSidebar, 0);   // do this on a delay so we don't hurt perf. on bringing up a new window
    }
  }
}


function toggleContactsSidebar()
{
  var sidebarBox = top.document.getElementById("sidebar-box");
  var sidebarSplitter = top.document.getElementById("contacts-pane-splitter");
  var sidebarState = sidebarSplitter.getAttribute("state");
  var elem = top.document.getElementById("viewContactsSidebar");

  if (sidebarBox.hidden) 
  {
    sidebarBox.hidden = false;
    sidebarBox.removeAttribute("collapsed");
    sidebarSplitter.hidden = false;
    if (elem)
      elem.setAttribute("checked","true");

    var sidebar = top.document.getElementById("sidebar");
    var sidebarUrl = sidebar.getAttribute("src");
    // if we have yet to initialize the src url on the sidebar than go ahead and do so now...
    // we do this lazily here, so we don't spend time when bringing up the compose window loading the address book
    // data sources. Only when the user opens the address picker do we set the src url for the sidebar...
    if (sidebarUrl == "")
      sidebar.setAttribute("src", "chrome://contactssidebar/content/contactsPanel.xul");

    sidebarBox.setAttribute("sidebarVisible", "true");
  }
  else 
  {
    // Hiding the sidebar when focused kills keyboard input
    // Put focus on the next pane when the Contacts Sidebar is focused
    for (var currentNode = top.document.commandDispatcher.focusedElement; currentNode; currentNode = currentNode.parentNode)
      // But skip the last node, which is a XULDocument.
      if ( (currentNode instanceof XULElement) && currentNode.id == "contactsPanel" )
      {
        csSetFocusThreadPane();
        break;
      }

    sidebarBox.hidden = true;
    sidebarSplitter.hidden = true;
    if (elem)
      elem.removeAttribute("checked");

    sidebarBox.setAttribute("sidebarVisible", "false");
  }
}

function csSetFocusThreadPane()
{
    var threadTree = csGetThreadTree();
    threadTree.focus();
}

function csGetThreadTree()
{
  return top.document.getElementById('threadTree');
}
