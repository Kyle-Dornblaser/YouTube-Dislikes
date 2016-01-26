var apiKey = 'AIzaSyDO-hL-3kWRxVidVprUMznMEYCzOlr2P_E';
var videos = [];
var items_processed;
var total_items;
var ajax_calls;
var ajax_completed;
var items_rendered;
var running = false;

var Video = function(id, likes, dislikes, title, thumbnail) {
  this.id = id;
  this.likes = likes;
  this.dislikes = dislikes;
  if (this.dislikes !== 0) {
    this.dislike_percent = this.dislikes / (this.likes + this.dislikes) * 100.0;
  } else {
    this.dislike_percent = 0;
  }
  this.title = title;
  this.thumbnail = thumbnail;
};

$(function() {
  $('#more').click(function() {
    render_items(true);
  });
});


function fetch_list_page(request, token)
{
  $.get( request + '&pageToken=' + token, function( data ) {
    ajax_completed++;
    var last = false;
    if (data.nextPageToken)
    {
      ajax_calls++;
      fetch_list_page(request, data.nextPageToken);
    }
    else {
      last = true;
    }
    items_processed += data.items.length;
    total_items = data.pageInfo.totalResults;
    set_status('Loading results. ' + items_processed + ' of about ' + total_items + ' videos processed.', 'info');
    var video_ids = [];
    for (var i = 0; i < data.items.length; i++)
    {
      video_ids.push(data.items[i].contentDetails.videoId);
    }
    ajax_calls++;
    get_item_info(video_ids, last);
  });
}

function get_item_info(video_ids_array, last)
{
  video_ids_string = video_ids_array.join(',');
  request = 'https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=' + video_ids_string + '&key=' + apiKey;
  $.get( request, function(data) {
    for (var i = 0; i < data.items.length; i++)
    {
      var item = data.items[i];
      videos.push(new Video(item.id, parseInt(item.statistics.likeCount), parseInt(item.statistics.dislikeCount), item.snippet.title, item.snippet.thumbnails.medium.url));
    }
    ajax_completed++;
  });
  render_items(false);
  if (last) {
    done();
  }
}

function render_items(add_more) {
    videos.sort(compare_by_dislike_percent);
    var html = '';
    for (var i = 0; i < 10 && items_rendered < videos.length; i++) {
      var index;
      if (add_more) {
        index = items_rendered;
      } else {
        index = i;
      }
      html += '<div class="row">';
      html +=   '<div class="col-md-4">';
      html +=     '<a href="https://www.youtube.com/watch?v=' + videos[index].id + '">';
      html +=       '<img src="' + videos[index].thumbnail + '" class="img-fill">';
      html +=     '</a>';
      html +=   '</div>';
      html +=   '<div class="col-md-8">';
      html +=     '<h2><a href="https://www.youtube.com/watch?v=' + videos[index].id + '">' + videos[index].title + '</a></h2>';
      html +=     '<h3>' + Math.round(videos[index].dislike_percent) + '% of people disliked this video.</h3>';
      html +=     '<h3><span class="label label-primary">Likes: ' + videos[index].likes + ' <span class="glyphicon glyphicon-thumbs-up"></span></span> <span class="label label-danger">Dislikes: ' + videos[index].dislikes + ' <span class="glyphicon glyphicon-thumbs-down"></span></span></h3>';
      html +=   '</div>';
      html += '</div>';
      if (add_more || items_rendered < 10) {
        items_rendered++;
      }
    }
    if (add_more) {
      $('#results').append(html);
    } else {
      $('#results').html(html);
    }
    if (items_rendered === videos.length) {
      $('#more').hide();
    }
}

function done() {
  if (ajax_calls !== ajax_completed) {
    setTimeout(function() {
      done();
    }, 100);
  } else {
    set_status('Complete.', 'success');
    render_items(false);
    $('#more').show();
    running = false;
  }
}

function compare_by_dislike_percent(a,b) {
  if (a.dislike_percent < b.dislike_percent)
    return 1;
  else if (a.dislike_percent > b.dislike_percent)
    return -1;
  else
    return 0;
}

function find_videos()
{
  if (running) {
    console.log('Already running');
  } else {
    running = true;
    reset();
    set_status('Loading results.', 'info');
    var channel_name = $('#channel_name').val();
    set_status('Searching for channel.', 'info');
    var request = 'https://www.googleapis.com/youtube/v3/search?part=id%2Csnippet&maxResults=1&q=' + channel_name + '&type=channel&key=' + apiKey;
    $.get(request, function(data) {
      if (data.items.length > 0) {
        var channel_id = data.items[0].id.channelId;
        request = 'https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=' + channel_id + '&key=' + apiKey;
        ajax_calls++;
        $.get(request, function( data ) {
          upload_playlist = data.items[0].contentDetails.relatedPlaylists.uploads;
          var playlist_items_request = 'https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=' + upload_playlist + '&key=' + apiKey;
          fetch_list_page(playlist_items_request, '');
        });
      } else {
        running = false;
        set_status('Channel "' + channel_name + '" does not exist.', 'danger');
      }
    });
  }
}

function set_status(message, alert_type) {
  $('#status').text(message);
  $('#status').removeClass().addClass('alert alert-' + alert_type)
  $('#status').show();
}

function reset() {
    $('#status').empty();
    $('#status').hide();
    $('#results').empty();
    $('#more').hide();
    videos = [];
    items_processed = 0;
    total_items = 0;
    ajax_calls = 0;
    ajax_completed = 0;
    items_rendered = 0;
}
