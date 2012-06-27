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
		$('.tasklists').animate({left: oper + viewwidth + 'px'}, 250, refresh_view);
	});
	
	// reset form elements in case of page reload
	$('.task.completed input:checkbox').prop('checked', true);
	$('.task:not(".completed") input:checkbox').prop('checked', false);
	
	
	// check boxes
	$('.task input:checkbox').change(function() {
		var data = {
			tasklist: $(this).closest('.tasklist').attr('id').slice(9),
			task: $(this).closest('.task').attr('id').slice(5),
		}
		
		if ($(this).prop('checked')) {
			$(this).closest('li').find('.task').addClass('completed').find('input:checkbox').prop('checked', true);
			
			data['completed'] = new Date().toISOString();
			data['status'] = 'completed';
		
		} else {
			$(this).parents('.tasklist li').find('.task').removeClass('completed').find('input:checkbox').prop('checked', false);
			
			data['completed'] = null;
			data['status'] = 'needsAction';
		}

		$.ajax({
			url: webroot + '/_update_task',
			type: 'patch',
			data: data,
			success: function(data) {
				alert(data);
			}
		});
	});
	
	
	// sort list
	
	$('.tasklists > .tasklist > ul').nestedSortable({
		listType: 'ul',
		items: 'li',
		toleranceElement: '> div',
		handle: '> div',
	}).bind('sortupdate', function(e, ui) {
		e.stopPropagation();
		
		var data = {
			tasklist: ui.item.closest('.tasklist').attr('id').slice(9),
			task: ui.item.children('.task').attr('id').slice(5),
		}
		
		// find the previous task at this level, if any
		if (ui.item.prev().children('.task').length) {
			data['previous'] = ui.item.prev().children('.task').attr('id').slice(5);
		}
		// find the parent task, if any
		if (ui.item.parents('.tasklist li').length) {
			data['parent'] = ui.item.parent().siblings('.task').attr('id').slice(5);
		}
		
		$.ajax({
			url: webroot + '/_move_task',
			type: 'post',
			data: data,
			success: function(data) {
				alert(data);
			}
		});
	});
	
	
	/*
	// split list
	$('.task').hover(function() {
		$('<a class="split" />').appendTo(this).click(function() {
			
		}, false)
	}, function() {
		
	});
	*/
	
	
	
	
	
});