$(function() {
	
	// scroll to the tasklist passed in the URL and given the 'start' class
	if ($('.tasklist.start').length) {
		var index = $('.tasklist.start').index('.tasklist');
		$('.tasklists').css('left', -index * $('.tasklist-view').width() + 'px');
	}
	
	refresh_view();
	
	// animate horizontal paging between lists
	$('.tasknav a').click(false).click(function() {
		var oper = $(this).hasClass('next') ? '-=' : '+=';
		$('.tasklists').animate({left: oper + $('.tasklist-view').width() + 'px'}, 250, refresh_view);
	});
	
	// edit task titles and notes
	$('.tasktitle, .tasknotes').each(function() {
		$(this).make_editable();
	});
	
	// check boxes
	$('.task .checkbox').click(toggle_checkboxes);

	// add task
	$('.tasklist .add').click(add_task);

	// delete task
	$('.task .delete').click(delete_task);
	
	// show/hide/create notes
	$('.task .notetoggle').click(toggle_notes);
	
	// sort list
	$('.tasklists > .tasklist > ul').nestedSortable({
		listType: 'ul',
		items: 'li',
		toleranceElement: '> div',
		handle: '> div',
	}).bind('sortupdate', update_sort_order);

});
	

function do_request(method, data, callback) {
	// send a request to flask, and optionally pass its response to a callback
	$.post(webroot + '/_' + method, data, (callback !== undefined) ? callback : function(resp) {
		// obviously temporary default callback
		alert(resp);
	});
}


function refresh_view() {
	// show or hide nav buttons, change any other effects after list switch
	listpos = -parseInt($('.tasklists').css('left')) / $('.tasklist-view').width();
	$('.tasknav a').hide();
	if (listpos > 0) {
		$('.tasknav .prev').show();
	}
	if (listpos < $('.tasklist').length - 1) {
		$('.tasknav .next').show();
	}
}


$.fn.extend({
	// initializes an element to be editable
	make_editable: function() {
		$(this).click(function() {
			$(this).focus(); // does this work?
		});
		$(this).editable({
			type: $(this).hasClass('tasknotes') ? 'textarea' : 'text',
			onEdit: function(content) {
				this.focus(); // this doesn't seem to work
			},
			onSubmit: function(content) {
				var data = {
					tasklist: this.closest('.tasklist').attr('id').slice(9),
				};
				var $task = this.closest('.task');
				var taskid = $task.attr('id') ? $task.attr('id').slice(5) : null;

				if (this.hasClass('tasktitle')) {
					if (content.current == '') {
						// remove entire task
						this.closest('li').remove();
						if (taskid) {
							data['task'] = taskid;
							do_request('delete_task', data);
						}

					} else if (content.current != content.previous) {
						data['title'] = content.current;

						if (taskid) {
							// update an existing task (already has an id)
							data['task'] = taskid;
							do_request('update_task', data);
						
						} else {
							// create a new task and assign it an id
							do_request('add_task', data, function(resp) {
								$task.attr('id', 'task-' + resp.id);
								alert('added');
							});
							$task.find('input:checkbox').change(toggle_checkboxes);
						}
					}

				} else if (this.hasClass('tasknotes')) {
					if (content.current == '') {
						// remove note html
						this.remove();
						$task.find('.notetoggle').html('+');
					}

					if (content.current != content.previous) {
						// update task with new notes (or lack thereof)
						data['task'] = taskid;
						data['notes'] = content.current;
						do_request('update_task', data);
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


function toggle_checkboxes(e) {
	e.preventDefault();
	
	// find out what other tasks' statuses are affected by this and submit them
	if (!$(this).closest('li').children('.task').hasClass('completed')) {
		// check, and also check all descendants
		$(this).closest('li').find('.task').not('.completed')
			.addClass('completed').each(submit_check_status)
			.find('.checkbox').html('&#x2713;');
	
	} else {
		// uncheck, and uncheck all ancestors and descendants (but not siblings)
		$(this).closest('li').find('.checkbox').html('&nbsp;');
		$(this).parents('.tasklist li').children('.task.completed') // ancestors
			.add($(this).closest('li').find('.task.completed')) // descendants
			.removeClass('completed').each(submit_check_status)
			.find('.checkbox').html('&nbsp;');
	}
}


function submit_check_status() {
	// submit the task status to the api
	var data = {
		tasklist: $(this).closest('.tasklist').attr('id').slice(9),
		task: $(this).attr('id').slice(5),
	};
	
	if ($(this).hasClass('completed')) {
		data['completed'] = new Date().toISOString();
		data['status'] = 'completed';
	} else {
		data['completed'] = null;
		data['status'] = 'needsAction';
	}
	
	do_request('update_task', data);
}


function add_task(e) {
	e.preventDefault();
	$(this).closest('.tasklist').children('ul').prepend(
		$('<li />').append(
			$('<div />').addClass('task').append(
				$('<input type="checkbox" />')
			).append(
				$('<a href="#" />').addClass('delete control').html('&#xd7;').click(delete_task)
			).append(
				$('<a href="#" />').addClass('notetoggle control').html('+').click(toggle_notes)
			).append(
				$('<span />').addClass('tasktitle').make_editable().click()
			)
		)
	);
}


function delete_task(e) {
	e.preventDefault();
	var data = {
		tasklist: $(this).closest('.tasklist').attr('id').slice(9),
		task: $(this).closest('.task').attr('id').slice(5),
	};
	$(this).closest('li').remove();
	
	do_request('delete_task', data);
}


function toggle_notes(e) {
	e.preventDefault();
	var $task = $(this).closest('.task');
	
	if (!$task.find('.tasknotes:visible').length) {
		if (!$task.find('.tasknotes').length) {
			// create notes
			$task.append($('<span />').addClass('tasknotes').make_editable().click());
		} else {
			// show notes
			$task.find('.tasknotes').slideDown(100);
		}
		$(this).html('&ndash;');
		
	} else {
		// hide notes
		$task.find('.tasknotes').slideUp(100);
		$(this).html('+');
	}
}


function update_sort_order(e, ui) {
	e.stopPropagation();
	
	var data = {
		tasklist: ui.item.closest('.tasklist').attr('id').slice(9),
		task: ui.item.children('.task').attr('id').slice(5),
	};
	
	// find the previous task at this level, if any
	if (ui.item.prev().children('.task').length) {
		data['previous'] = ui.item.prev().children('.task').attr('id').slice(5);
	}
	
	// find the parent task, if any
	if (ui.item.parents('.tasklist li').length) {
		data['parent'] = ui.item.parent().siblings('.task').attr('id').slice(5);
		
		// if unchecked, also uncheck all ancestors
		if (!ui.item.children('.task').find('input:checkbox').is(':checked')) {
			ui.item.parents('.tasklist li').children('.task')
				.removeClass('completed').find('input:checkbox').filter(':checked').each(function() {
					$(this).prop('checked', false);
					submit_check_status($(this));
				})
		}
	}
	
	do_request('move_task', data);
}

/*
// split list
$('.task').hover(function() {
	$('<a class="split" />').appendTo(this).click(function() {
		
	}, false)
}, function() {
	
});
*/
