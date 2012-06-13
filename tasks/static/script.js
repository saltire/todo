$(function() {
	
	var viewwidth = $('.tasklist-view').width();
	var listcount = $('.tasklist').length;
	var listpos;

	function refresh_view() {
		// show or hide nav buttons, change any other effects after list switch
		listpos = -parseInt($('.tasklists').css('left')) / viewwidth;
		$('.tasknav a').hide();
		if (listpos > 0) {
			$('.tasknav .prev').show();
		}
		if (listpos < listcount - 1) {
			$('.tasknav .next').show();
		}
	}
	
	refresh_view();
	
	$('.tasknav a').click(false).click(function() {
		var oper = $(this).hasClass('next') ? '-=' : '+=';
		$('.tasklists').animate({left: oper + viewwidth + 'px'}, refresh_view);
	});
	
	$('.task input:checkbox').change(function() {
		var $tasks = $(this).closest('li').find('.task');
		if ($(this).prop('checked')) {
			$tasks.addClass('completed').find('input:checkbox').prop('checked', true);
		} else {
			$tasks.removeClass('completed').find('input:checkbox').prop('checked', false);
		}

		$.ajax({
			url: webroot + '/_update_task',
			type: 'put',
			data: {
				tasklist: $(this).closest('.tasklist').attr('id').slice(9),
				task: $(this).closest('.task').attr('id').slice(5),
				completed: new Date().toISOString(),
			},
			success: function(data) {
				alert(data);
			}
		});
	});
	
});