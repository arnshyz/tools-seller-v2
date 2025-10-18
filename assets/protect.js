(function(){
  function preventEvent(event){
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    return false;
  }

  document.addEventListener('contextmenu', preventEvent, {capture:true});
  document.addEventListener('dragstart', preventEvent, {capture:true});

  document.addEventListener('keydown', function(event){
    const key = event.key || '';
    const normalized = key.toLowerCase();
    const isCtrl = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;

    if(key === 'F12'){
      return preventEvent(event);
    }

    if(isCtrl && isShift && ['i','j','c'].includes(normalized)){
      return preventEvent(event);
    }

    if(isCtrl && ['u','s','p'].includes(normalized)){
      return preventEvent(event);
    }

    if(isCtrl && event.altKey && ['i','j'].includes(normalized)){
      return preventEvent(event);
    }

    if(normalized === 'f10' || normalized === 'f11'){
      return preventEvent(event);
    }
  }, {capture:true});
})();
