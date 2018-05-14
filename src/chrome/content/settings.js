function init() {
  var autoPopulate = document.getElementById("autoPopulate");
  
  initPrefs();
  // Set autoSearchQuery disabled attribute text to reflect 
  // autoSearchQuery checkbox state
  enableAutoSearchQuery(autoPopulate.checked)
}


function enableAutoSearchQuery(value)
{
  var autoSearchQuery = document.getElementById("autoSearchQuery");
  if (autoSearchQuery) {
    autoSearchQuery.disabled = !value;
  }
}
