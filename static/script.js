$(function() {
	
	// scroll to the tasklist passed in the URL and given the 'start' class
	if ($('.tasklist.start').length) {
		var index = $('.tasklist.start').index('.tasklist');
		$('.tasklists').css('left', -index * $('.tasklist-view').width() + 'px');
	}
	
	// animate horizontal paging between lists
	$('.tasknav .arrows a').hide().click(false).click(function() {
		var oper = $(this).hasClass('next') ? '-=' : '+=';
		$('.tasklists').animate({left: oper + $('.tasklist-view').width() + 'px'}, 250, refresh_arrows);
	});
	refresh_arrows();
	
	// create new task list
	$('.tasknav .new').click(false).click(create_new_tasklist);
	
	// tasklist controls
	$('.tasklist .add').click(false).click(add_task);
	$('.tasklist .delete').click(false).click(delete_tasklist);

	// task controls
	$('.task .notetoggle').click(false).click(toggle_notes);
	$('.task .split').click(false).click(split_task);
	$('.task .remove').click(false).click(remove_task);
	
	// edit task titles and notes
	$('.tltitle, .tasktitle, .tasknotes').each(function() {
		$(this).make_editable();
	});
	
	// check boxes
	$('.task .checkbox').click(false).click(toggle_checkboxes);

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
		alert(JSON.stringify(resp));
	});
}


function refresh_arrows() {
	// show or hide arrow buttons, change any other effects after list switch
	listpos = -parseInt($('.tasklists').css('left')) / $('.tasklist-view').width();
	if (listpos > 0) {
		$('.tasknav .prev').fadeIn(150);
	} else {
		$('.tasknav .prev').fadeOut(150);
	}
	if (listpos < $('.tasklist-column').length - 1) {
		$('.tasknav .next').fadeIn(150);
	} else {
		$('.tasknav .next').fadeOut(150);
	}
}


$.fn.extend({
	get_tasklist_id: get_tasklist_id,
	make_editable: make_editable
});


function get_tasklist_id() {
	// get id of parent tasklist
	var $tasklist = $(this).closest('.tasklist');
	
	if ($tasklist.hasClass('sublist')) {
		// class will be 'tasklist sublist-{id}'
		return $tasklist.attr('data-parent');
		
	} else {
		// id will be 'tasklist-{id}'
		return $tasklist.attr('id') ? $tasklist.attr('id').slice(9) : null;
	}
}


function make_editable() {
	// initializes an element to be editable
	$(this).keypress(function(e) {
		// trigger submit when user presses enter
		if (e.which == 13) {
			$(this).blur();
		}
	}).editable({
		type: $(this).hasClass('tasknotes') ? 'textarea' : 'text',
		onSubmit: function(content) {
			var data = {
				tasklist: this.get_tasklist_id(),
			};
			var $tasklist = this.closest('.tasklist');
			var $task = this.closest('.task');
			var taskid = $task.attr('id') ? $task.attr('id').slice(5) : null;
			
			var $sublist = this.closest('.sublist');
			var sublistid = $sublist.length ? $sublist.attr('id').slice(8) : null;

			// edit tasklist title

			if (this.hasClass('tltitle')) {
				if (data['tasklist'] === null) {
					if (content.current != content.previous) {
						// create new tasklist and assign it an id
						data['title'] = content.current;
						do_request('create_tasklist', data, function(resp) {
							$tasklist.attr('id', 'tasklist-' + resp.id);
							alert(JSON.stringify(resp));
						});
						
					} else {
						// remove tasklist and scroll back
						$tasklist.fadeOut(250, function() {
							$(this).closest('.tasklist-column').remove();
							$('.tasklists').animate({left: '+=' + $('.tasklist-view').width() + 'px'}, 250, refresh_arrows);
						});
									
					}
					
				} else if (content.current != content.previous) {
					data['title'] = content.current;
					if (sublistid) {
						// change the task title in the parent list
						$('#task-' + sublistid).children('.tasktitle').html(content.current);
						
						// update the sublist's task title
						data['task'] = sublistid;
						do_request('update_task', data);
						
					} else {
						// update the tasklist's title
						do_request('update_tasklist', data);
					}
				}
				
			// edit task title
			
			} else if (this.hasClass('tasktitle')) {
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
						if (this.closest('.sublist').length) {
							data['parent'] = this.closest('.sublist').attr('id').slice(8);
						}
						
						// create a new task and assign it an id
						do_request('add_task', data, function(resp) {
							$task.attr('id', 'task-' + resp.id);
							alert(JSON.stringify(resp));
						});
					}
				}
				
			// edit task notes

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
	});
	
	return $(this);
}


// event functions


function create_new_tasklist(e) {
	$('.tasklists').append(
		$('<div />').addClass('tasklist-column').append(
			$('<div />').addClass('tasklist').append(
				$('<div />').addClass('backg')
			).append(
				$('<div />').addClass('titlebar').append(
					$('<span />').addClass('tltitle').make_editable().click()
				).append(
					$('<div />').addClass('controls').append(
						$('<a href="#" />').addClass('add').html('&#xff0b;').click(false).click(add_task)
					).append(
						$('<a href="#" />').addClass('link').html('&para;')
					).append(
						$('<a href="#" />').addClass('delete').html('&#x2715;').click(false).click(delete_tasklist)
					)
				)
			)
		)
	);

	$('.tasklists').animate({left: -($('.tasklist-column').length - 1) * $('.tasklist-view').width() + 'px'}, refresh_arrows);
}


function delete_tasklist(e) {
	if (confirm('Delete entire tasklist?') == true) {
		var $tlcolumn = $(this).closest('.tasklist-column');
		var colwidth = $('.tasklist-view').width();
		
		$tlcolumn.css({width: colwidth + 'px', height: '1px'});
		$(this).closest('.tasklist').fadeOut(250, function() {
			if ($tlcolumn.index() == 0 && $('.tasklist-column').length > 1) {
				$('.tasklists').animate({left: '-=' + colwidth + 'px'}, 250, function() {
					$tlcolumn.remove();
					$('.tasklists').css({left: '+=' + colwidth + 'px'});
					refresh_arrows();
				});
				
			} else {
				$('.tasklists').animate({left: '+=' + colwidth + 'px'}, 250, function() {
					$tlcolumn.remove();
					refresh_arrows();
				});
			}
		});
		
		do_request('delete_tasklist', {tasklist: $(this).get_tasklist_id()});
	}
}


function toggle_checkboxes(e) {
	// find out what other tasks' statuses are affected by this and submit them
	
	// if it's currently unchecked
	if (!$(this).closest('li').children('.task').hasClass('completed')) {
		// check, and also check all descendants
		$(this).closest('li').find('.task').not('.completed')
			.addClass('completed').each(submit_check_status)
			.find('.checkbox').html('&#x2713;');
	
	// if it's currently checked
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
		tasklist: $(this).get_tasklist_id(),
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
	$(this).closest('.tasklist').children('ul').prepend(
		$('<li />').append(
			$('<div />').addClass('task').append(
				$('<a>&nbsp;</a>').addClass('checkbox').click(false).click(toggle_checkboxes)
			).append(
				$('<span />').addClass('tasktitle').make_editable().click()
			).append(
				$('<div />').addClass('controls').append(
					$('<a href="#" />').addClass('notetoggle').html('+').click(false).click(toggle_notes)
				).append(
					$('<a href="#" />').addClass('split').html('s').click(false).click(split_task)
				).append(
					$('<a href="#" />').addClass('remove').html('&#xd7;').click(false).click(remove_task)
				)
			)
		)
	);
}


function remove_task(e) {
	var data = {
		tasklist: $(this).get_tasklist_id(),
		task: $(this).closest('.task').attr('id').slice(5),
	};
	$(this).closest('li').remove();
	
	do_request('remove_task', data);
}


function toggle_notes(e) {
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


function split_task(e) {
	var $task = $(this).closest('.task');
	var $parent = $(this).closest('.tasklist');
	var $taskid = $task.attr('id').slice(5);
	var $tlid = $(this).get_tasklist_id();
	
	// create new sublist
	var $newlist = $('<div />').addClass('tasklist sublist').attr('id', 'sublist-' + $taskid).attr('data-parent', $tlid).append(
		$('<div />').addClass('backg')
	).append(
		$('<div />').addClass('upnav').append(
			$('<a href="#" />').html('&#x25b2;')
		)
	).append(
		$('<a href="link" />').addClass('link').html('&para;')
	).append(
			$('<a href="#" />').addClass('add').html('&#xff0b;')
	).append(
		$('<h2 />').addClass('tltitle').html($task.children('.tasktitle').html()).make_editable()
	).append(
		$task.siblings('ul').clone(true, true)
	).hide();
	
	// add a new listview below with a new list
	$parent.after($newlist);
	$newlist.slideDown();
	
	// hide the parent list's tasks and controls
	$parent.children('a, .upnav').fadeOut();
	$parent.children('ul').slideUp();
	if ($parent.hasClass('sublist')) {
		$parent.animate({'margin-top': '10px'});
	}
	
	// remove the original task tree when both animations are done
	$parent.children('ul').add($newlist).promise().done(function() {
		$task.siblings('ul').remove();
	});
	
	// bind upnav button to merge the sublist back into the parent
	$('.upnav a', $newlist).click(false).click(merge_task);
	
	// bind add and link buttons
	$('.add', $newlist).click(false).click(add_task);
}


function merge_task(e) {
	var $sublist = $(this).closest('.sublist');
	var $task = $('#task-' + $sublist.attr('id').slice(8));
	var $parent = $task.closest('.tasklist');
	
	$task.after($sublist.children('ul').clone(true, true));
	
	// hide this view
	$sublist.slideUp();
	
	// show parent tasklist and its controls
	$parent.children('a, .upnav').fadeIn();
	$parent.children('ul, .upnav').slideDown();
	if ($parent.hasClass('sublist')) {
		$parent.animate({'margin-top': '60px'});
	}
	
	// remove the lowest task view when animations are done
	$parent.children('ul').add($sublist).promise().done(function() {
		$sublist.remove();
	});
}


function update_sort_order(e, ui) {
	e.stopPropagation();
	
	var data = {
		tasklist: ui.item.get_tasklist_id(),
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

