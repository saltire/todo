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
	
	function do_request(method, type, data) {
		$.ajax({
			url: webroot + '/_' + method,
			type: type,
			data: data,
			success: function(resp) {
				alert(resp);
			}
		});
		
	}
	
	refresh_view();
	
	// animate horizontal paging between lists
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

		do_request('update_task', 'patch', data);
	});
	
	
	// edit text
	$('.tasktitle, .tasknotes').editable({
		onSubmit: function(content) {
			var data = {
				tasklist: this.closest('.tasklist').attr('id').slice(9),
				task: this.closest('.task').attr('id').slice(5),
			}

			if (this.hasClass('tasktitle')) {
				data['title'] = content.current;
				
			} else if (this.hasClass('tasknotes')) {
				data['notes'] = content.current;
			}
			
			do_request('update_task', 'patch', data);
		},
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
		
		do_request('move_task', 'post', data);
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