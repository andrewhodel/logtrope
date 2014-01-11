var socket = Object;

if ($.cookie('logtropekey')) {
    doLogin($.cookie('logtropekey'));
}

$('#login').on("click", function (event) {
    event.preventDefault();
    doLogin($('#key').val());
});

$('#key').keydown(function (event) {
    if (event.which == 13) {
        event.preventDefault();
        doLogin($('#key').val());
    }
});

$('#logout').on("click", function (event) {
    event.preventDefault();
    $.removeCookie('logtropekey');
    window.location.reload();
});

function doLogin(key) {

    socket = new io.connect('/', {
        //login
        query: 'key=' + key + '',
        'force new connection': true
    });
    socket.on('loginValid', function (data) {

        // login success
        $('#cover').hide('fast');
        $.cookie('logtropekey', key, {
            expires: 7
        });

    });

    socket.on('error', function (data) {

        $.removeCookie('logtropekey');
        alert('failed to login');

    });

    socket.on('hosts', function (data) {

        //console.log('got hosts', data);

        var h = '';

        for (var i=0; i<data.length; i++) {
            h += '<div id="host' + data[i].host + '" class="host">';
            h += '<p class="htitle"><a href="#" onclick="showLog(\'' + data[i].host + '\'); return false;">' + data[i].host + '</a> <a href="#" onclick="deleteOne(\'' + data[i].host + '\'); return false;" style="float: right;">X</a></p>';
            h += '<p class="hstatus"><span id="hostSeverity' + data[i].host + '">' + data[i].severity + '</span> - <span id="hostEpochago' + data[i].host + '" class="epochago">' + data[i].unixts + '</span></p>';
            h += '</div>';
        }

        $('#navigation').html(h);
        $('.epochago').epochago();

    });

    socket.on('messages', function (data) {

        //console.log('got messages', data);

        var h = '<h2>'+data[0].host+'</h2>';

        for (var i=0; i<data.length; i++) {
            h += '<div class="message">';
            h += '<p class="mtitle">' + data[i].severity + ' - <span class="epochago">' + data[i].unixts + '</span></p>';
            h += '<p class="mcontent">' + data[i].content + '</p>';
            h += '</div>';
        }

        $('#content').html(h);
        $('.epochago').epochago();

    });

    socket.on('update', function (msg) {

        //console.log('got update', msg);

        $('#hostSeverity' + msg.host).html(msg.severity);
        $('#hostEpochago' + msg.host).html(msg.unixts);

        $('.epochago').epochago();

    });

}

// keep epochago's updated
setInterval("$('.epochago').epochago()", 30000);

function showLog(host) {
    socket.emit('showLog', {
        host: host
    });
}

function deleteOne(host) {
    $('#host' + host).remove();
    socket.emit('deleteOne', {
        host: host
    });
}
