Handlebars.registerHelper('truncate', function (str, len) {
    if (str.length > len) {
        var new_str = str.substr(0, len + 1);

        while (new_str.length) {
            var ch = new_str.substr(-1);
            new_str = new_str.substr(0, -1);

            if (ch == ' ') {
                break;
            }
        }

        if (new_str === '') {
            new_str = str.substr(0, len);
        }

        return new Handlebars.SafeString(new_str + '...');
    }
    return str;
});

Handlebars.registerHelper('CSSSafeString', function (passedString) {
    var theString = passedString.substring(0, 150);
    return new Handlebars.SafeString(passedString.replaceAll('.', '-').replaceAll('/', '-'));
});

Handlebars.registerHelper('dateFormatter', function (rfc822Date) {
    return moment(new Date(rfc822Date)).format('DD/MM/YYYY HH:mm:ss')
});

Handlebars.registerHelper('humanFileSize', function (bytes, si) {
    return humanFileSize(bytes, si);
});

Handlebars.registerHelper('encode', function (string) {
    return encodeURIComponent(string);
});

Handlebars.registerHelper('replace-colon', function (options) {
    return colon_to_dash(options.fn(this))
});