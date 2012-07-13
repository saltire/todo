$(function() {
	
	var viewwidth = $('.tasklist-view').width();
	var listcount = $('.tasklist').length;
	var listpos;


	// send a request to flask, and optionally pass its response to a callback
	function do_request(method, type, data, callback) {
		$.ajax({
			url: webroot + '/_' + method,
			type: type,
			data: data,
			success: (callback !== undefined) ? callback : function(resp) {
				// obviously temporary default callback
				alert(resp);
			}
		});
	}
	
	
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
	

	$.fn.extend({
		// initializes an element to be editable
		make_editable: function() {
			$(this).editable({
				onEdit: function(content) {
					this.focus(); // this doesn't seem to work
				},
				onSubmit: function(content) {
					if (content.current != content.previous) {
						var data = {
							tasklist: this.closest('.tasklist').attr('id').slice(9),
						}

						if (this.hasClass('tasktitle')) {
							data['title'] = content.current;
							
						} else if (this.hasClass('tasknotes')) {
							data['notes'] = content.current;
						}
						
						var $task = this.closest('.task');
						
						if ($task.attr('id')) {
							// update an existing task (already has an id)
							data['task'] = $task.attr('id').slice(5);
							do_request('update_task', 'patch', data);
						
						} else {
							// create a new task and assign it an id
							do_request('add_task', 'post', data, function(resp) {
								$task.attr('id', 'task-' + resp.id);
							});
							$task.find('input:checkbox').change(toggle_checkboxes);
						}
					}
				}
			}).keypress(function(e) {
				// trigger submit when user presses enter
				if (e.which == 13) {
					$(this).blur();
				}
			});
			
			return $(this);
		}
	});
	
	
	refresh_view();
	
	// animate horizontal paging between lists
	$('.tasknav a').click(false).click(function() {
		var oper = $(this).hasClass('next') ? '-=' : '+=';
		$('.tasklists').animate({left: oper + viewwidth + 'px'}, 250, refresh_view);
	});

	
	// edit task titles and notes
	$('.tasktitle, .tasknotes').make_editable();

	
	// reset check boxes in case of page reload
	$('.task.completed input:checkbox').prop('checked', true);
	$('.task:not(".completed") input:checkbox').prop('checked', false);
	
	
	// check boxes
	$('.task input:checkbox').change(toggle_checkboxes);
			
	function toggle_checkboxes(e) {
		// find out what other tasks' statuses are affected by this and submit them
		if ($(this).prop('checked')) {
			$(this).closest('li').find('.task').addClass('completed').find('input:checkbox').each(function() {
				$(this).prop('checked', true);
				set_check_status($(this));
			});
		
		} else {
			$(this).parents('.tasklist li').find('.task').removeClass('completed').find('input:checkbox').each(function() {
				$(this).prop('checked', false);
				set_check_status($(this));
			})
		}
	}

	function set_check_status($checkbox) {
		// submit the task status to the api
		var data = {
			tasklist: $checkbox.closest('.tasklist').attr('id').slice(9),
			task: $checkbox.closest('.task').attr('id').slice(5),
		}
		
		if ($checkbox.prop('checked')) {
			data['completed'] = new Date().toISOString();
			data['status'] = 'completed';
		} else {
			data['completed'] = null;
			data['status'] = 'needsAction';
		}
		
		do_request('update_task', 'patch', data);
	}
	
	
	// add task
	$('.tasklist .add').click(false).click(function() {
		$(this).closest('.tasklist').children('ul').prepend(
			$('<li />').append(
				$('<div />').addClass('task').append(
					$('<input type="checkbox" />')
				).append(
					$('<span />').addClass('tasktitle').make_editable().click()
				// i think we'll add a second button to add the notes instead
				//).append(
				//	$('<span />').addClass('tasknotes').make_editable()
				)
			)
		);
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
