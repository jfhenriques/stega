//<![CDATA[

  $(document).ready(function(){

    var $encResponse = $("div#enc-response"),
        $decResponse = $("div#dec-response"),
        pendingEncodeAjax = false,
        pendingDecodeAjax = false,

        contentIsFile = false,

        fullSection = true,

        toggleCont = $("div#toggle_cont:first"),
        toggleFile = $("div#toggle_file:first"),

        contCont = $("textarea#cont:first"),
        contFile = $("input#file:first");

    const halfSecName = 'group-half-sec',
          fullSecName = 'group-full-sec',

          secDelimeter = 1000;


    function setContType(val)
    {
      if( val == "0" )
      {
        contentIsFile = false;

        toggleCont.show();
        toggleFile.hide();

        contCont.prop('disabled', false);
        contFile.prop('disabled', true);

      }
      else
      if( val == "1" )
      {
        contentIsFile = true;

        toggleCont.hide();
        toggleFile.show();

        contCont.prop('disabled', true);
        contFile.prop('disabled', false);
      }
    }

    var checkSetSectionType = function()
    {
      var w = $(window).width();

      if( fullSection )
      {
        if( w >= secDelimeter )
        {
          $('.' + fullSecName)
                .removeClass(fullSecName)
                .addClass(halfSecName);

          fullSection = false;
        }
      }
      else
      {
        if( w < secDelimeter )
        {
          $('.' + halfSecName)
                .removeClass(halfSecName)
                .addClass(fullSecName);
          
          fullSection = true;
        }
      }
    }


    $("form#f-encode input[type=radio]").click(function(){
      setContType($(this).val());
    });

    function printResponse(to, status, response)
    {
      to.empty();
      to.append("<p><b>Status:</b> " + status + "</p>");

      if( response )
        to.append($("<p><b>Response:</b> </p>").append(response));
    }

    function progressHandlingFunction(to, e)
    {
      if( e.total && e.position )
        to.html("<p><b>Sending:</b> " + ( 100 * (e.position/e.total) | 0) + " %</p>");
    }


    /*******************************************************************************************************************/

    $("form#f-encode").submit(function(event) {
      event.preventDefault();

      if( pendingEncodeAjax )
        return false;

      pendingEncodeAjax = true;

      var formData = new FormData(this),
          url = this.action;

      $.ajax({
        url: url,
        type: 'POST',
        xhr: function() {
            var myXhr = $.ajaxSettings.xhr();

            if(myXhr.upload)
                myXhr.upload.addEventListener('progress',
                    function(e){progressHandlingFunction($encResponse,e);}, false);

            return myXhr;
        },
        beforeSend: function() {
          $encResponse.empty();
          $encResponse.removeClass("hidden");

          formData.append('json', 1);
        },
        success: function(data, textStatus, jqXHR) {
          $encResponse.empty();
          $encResponse.append("<p><b>Status:</b> " + textStatus + "</p>");

          if( data && data.img )
          {
            var link = $('<a href="click-to-download-image">Click here to download image</a>');
            link.click(function() {
              $(this)
                .attr("href", "data:application/octet-stream;base64," + data.img)
                .attr("download", "file-encoded.png");
            });

            $encResponse.append('<p style="text-align:center"><img src="data:image/png;base64,' + data.img + '" class="auto" /></p>');
            $encResponse.append($('<p>').append(link));
          }
        },
        error: function(jqXHR, textStatus, error) {
          printResponse($encResponse, error, jqXHR.responseText);
        },
        complete: function() {
          pendingEncodeAjax = false;
        },
        dataType: 'json',
        data: formData,
        cache: false,
        contentType: false,
        processData: false
      });
      
      return false;
    });

    
    /*******************************************************************************************************************/

    $("form#f-decode").submit(function(event) {
      event.preventDefault();

      if( pendingDecodeAjax )
        return false;

      pendingDecodeAjax = true;

      var formData = new FormData(this),
          url = this.action;

      $.ajax({
        url: url,
        type: 'POST',
        xhr: function() {
            var myXhr = $.ajaxSettings.xhr();

            if(myXhr.upload)
                myXhr.upload.addEventListener('progress',
                    function(e){progressHandlingFunction($decResponse,e);}, false);

            return myXhr;
        },
        beforeSend: function() {
          $decResponse.empty();
          $decResponse.removeClass("hidden");

          formData.append('json', 1);
        },
        success: function(data, textStatus, jqXHR) {
          if( data && data.base64 )
          {
            var filename = "file-decoded",
                link = $('<a href="click-to-download-image">Click here to download decoded content</a>');

            if( data.extension )
              filename += "." + data.extension ;

            link.click(function() {
              $(this)
                .attr("href", "data:application/octet-stream;base64," + data.dec)
                .attr("download", filename);
            });

            printResponse($decResponse, textStatus, link);
            $decResponse.append("<p><b>Mimetype:</b> " + data.mimetype + " </p>");
          }
          else
            printResponse($decResponse, textStatus, data && data.dec);
        },
        error: function(jqXHR, textStatus, error) {
          printResponse($decResponse, error, jqXHR.responseText);
        },
        complete: function() {
          pendingDecodeAjax = false;
        },
        dataType: 'json',
        data: formData,
        cache: false,
        contentType: false,
        processData: false
      });
      
      return false;
    });

    /*******************************************************************************************************************/

    checkSetSectionType();
    setContType("0");

    $(window).resize(checkSetSectionType);


  });

//]]>
